package service

import (
	"context"
	"errors"
	"fmt"
	"html"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	appDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

const (
	accountNotifyMaxAttempts    = 4
	accountNotifyInitialBackoff = 5 * time.Second
)

type SMSProvider interface {
	Send(ctx context.Context, to, body string) error
}

type AccountNotifier interface {
	NotifyAdminsPatientRegistered(ctx context.Context, patient *userDomain.Patient) error
	NotifyPatientActivated(ctx context.Context, patient *userDomain.Patient, createdByAdmin bool, temporaryPassword string) error
}

type accountNotifier struct {
	baseUserRepo        userRepository.BaseUserRepository
	notificationService NotificationService
	smsProvider         SMSProvider
}

func NewAccountNotifier(
	baseUserRepo userRepository.BaseUserRepository,
	notificationService NotificationService,
	smsProvider SMSProvider,
) AccountNotifier {
	return &accountNotifier{
		baseUserRepo:        baseUserRepo,
		notificationService: notificationService,
		smsProvider:         smsProvider,
	}
}

func (s *accountNotifier) NotifyAdminsPatientRegistered(ctx context.Context, patient *userDomain.Patient) error {
	if patient == nil {
		return errors.New("bệnh nhân là bắt buộc")
	}

	admins, err := s.baseUserRepo.FindWithFilter(ctx, userRepository.UserFilter{
		Role: string(userDomain.RoleAdmin),
	})
	if err != nil {
		return err
	}

	var errs []error
	for _, admin := range admins {
		_, err := s.notificationService.PublishToUser(ctx, &usecase.InternalPublishNotificationInput{
			UserID: admin.ID,
			Type:   appDomain.NotificationTypeAccountRegistration,
			Title:  "Bệnh nhân mới chờ xác minh",
			Body:   fmt.Sprintf("%s vừa tự đăng ký và cần được xác minh.", patient.Name),
			Data: map[string]string{
				"patientId":          patient.ID.Hex(),
				"registrationSource": "self",
				"targetScreen":       "Patients",
			},
			DedupKey: fmt.Sprintf("account-registration:%s:admin:%s", patient.ID.Hex(), admin.ID.Hex()),
		})
		if err != nil {
			errs = append(errs, fmt.Errorf("notify admin %s: %w", admin.ID.Hex(), err))
		}
	}
	return errors.Join(errs...)
}

func (s *accountNotifier) NotifyPatientActivated(ctx context.Context, patient *userDomain.Patient, createdByAdmin bool, temporaryPassword string) error {
	if patient == nil {
		return errors.New("bệnh nhân là bắt buộc")
	}

	title := "Tài khoản đã được xác minh"
	message := "Thông tin của bạn đã được quản trị viên xác minh và tài khoản RPM hiện đã hoạt động."
	subject := constant.SubjectPatientAccountVerified
	emailDetails := ""
	smsBody := "RPM - Tai khoan da duoc xac minh va kich hoat. Ban co the dang nhap."
	if createdByAdmin {
		title = "Tài khoản RPM đã được tạo"
		message = "Quản trị viên đã tạo và kích hoạt tài khoản Remote Patient Monitoring cho bạn."
		subject = constant.SubjectPatientAccountCreated
		loginIdentifier := patient.Email
		if loginIdentifier == "" {
			loginIdentifier = patient.Phone
		}
		emailDetails = fmt.Sprintf(
			`<p><strong>Tài khoản:</strong> %s</p><p><strong>Mật khẩu tạm thời:</strong> %s</p><p><strong>Vui lòng đổi mật khẩu ngay sau khi đăng nhập.</strong></p>`,
			html.EscapeString(loginIdentifier),
			html.EscapeString(temporaryPassword),
		)
		smsBody = fmt.Sprintf(
			"RPM - Tai khoan: %s; Mat khau tam: %s. Doi mat khau ngay sau khi dang nhap.",
			patient.Phone,
			temporaryPassword,
		)
	}

	var errs []error
	if patient.Email != "" {
		body := fmt.Sprintf(
			constant.PatientAccountEmailTemplate,
			html.EscapeString(title),
			html.EscapeString(patient.Name),
			html.EscapeString(message),
			emailDetails,
		)
		if err := retryTransient(ctx, accountNotifyMaxAttempts, accountNotifyInitialBackoff, func() error {
			return util.SendEmail(patient.Email, subject, body)
		}); err != nil {
			errs = append(errs, fmt.Errorf("send email: %w", err))
		}
	}
	if patient.Phone != "" {
		if s.smsProvider == nil {
			errs = append(errs, errors.New("Twilio SMS chưa được cấu hình"))
		} else if err := retryTransient(ctx, accountNotifyMaxAttempts, accountNotifyInitialBackoff, func() error {
			return s.smsProvider.Send(ctx, patient.Phone, smsBody)
		}); err != nil {
			errs = append(errs, fmt.Errorf("send SMS: %w", err))
		}
	}

	if err := errors.Join(errs...); err != nil {
		log.Printf("[WARN] account notification for patient %s: %v", patient.ID.Hex(), err)
		return err
	}
	return nil
}

// retryTransient retries op with exponential backoff. Each channel (email/SMS)
// is retried independently so a successful send is not duplicated when the
// other channel fails.
func retryTransient(ctx context.Context, attempts int, initialBackoff time.Duration, op func() error) error {
	if attempts < 1 {
		attempts = 1
	}
	var err error
	backoff := initialBackoff
	for attempt := 1; attempt <= attempts; attempt++ {
		if err = op(); err == nil {
			return nil
		}
		if attempt == attempts {
			break
		}
		log.Printf("[WARN] account notification attempt %d/%d failed: %v; retrying in %s", attempt, attempts, err, backoff)
		select {
		case <-ctx.Done():
			return errors.Join(err, ctx.Err())
		case <-time.After(backoff):
		}
		backoff *= 2
	}
	return err
}
