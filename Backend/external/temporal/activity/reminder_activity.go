package activity

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type ReminderActivity struct {
	reminderRepo        repository.ReminderRepository
	prescriptionRepo    repository.PrescriptionRepository
	intakeRepo          repository.MedicationIntakeRepository
	notificationService service.NotificationService
}

func NewReminderActivity(
	repo repository.ReminderRepository,
	prescriptionRepo repository.PrescriptionRepository,
	intakeRepo repository.MedicationIntakeRepository,
	notificationService service.NotificationService,
) *ReminderActivity {
	return &ReminderActivity{
		reminderRepo:        repo,
		prescriptionRepo:    prescriptionRepo,
		intakeRepo:          intakeRepo,
		notificationService: notificationService,
	}
}

func (a *ReminderActivity) GetReminderActivity(ctx context.Context, reminderID string) (*domain.Reminder, error) {
	id, err := util.MustHexToObjectID(reminderID)
	if err != nil {
		return nil, err
	}
	return a.reminderRepo.FindByID(ctx, id)
}

func (a *ReminderActivity) SendReminderActivity(ctx context.Context, reminderID string, scheduledFor string) (bool, error) {
	id, err := util.MustHexToObjectID(reminderID)
	if err != nil {
		return false, err
	}

	reminder, err := a.reminderRepo.FindByID(ctx, id)
	if err != nil {
		return false, err
	}
	if reminder == nil {
		return false, fmt.Errorf("reminder not found")
	}

	scheduledAt, err := time.Parse(time.RFC3339, scheduledFor)
	if err != nil {
		return false, fmt.Errorf("invalid scheduled reminder time: %w", err)
	}

	skip, err := service.ShouldSkipMedicationReminder(ctx, a.prescriptionRepo, a.intakeRepo, reminder, scheduledAt)
	if err != nil {
		return false, err
	}
	if skip {
		return true, nil
	}

	var title string
	body := strings.TrimSpace(reminder.Message)
	targetScreen := "PatientNotifications"
	if reminder.Kind == domain.KindMeasure {
		title = "Nhắc nhở đo chỉ số"
		targetScreen = "InputMeasurementPatientScreen"
		if body == "" {
			body = "Đã đến giờ đo chỉ số sức khỏe. Vui lòng nhập số đo mới trên ứng dụng."
		}
	} else {
		title = "Nhắc nhở dùng thuốc"
		if body == "" {
			body = "Đã đến giờ thực hiện nhắc nhở sức khỏe của bạn."
		}
	}

	payload := map[string]string{
		"type":         "reminder",
		"reminderId":   reminder.ID.Hex(),
		"patientId":    reminder.PatientID.Hex(),
		"reminderKind": string(reminder.Kind),
		"scheduledFor": scheduledAt.UTC().Format(time.RFC3339),
		"targetScreen": targetScreen,
	}

	_, err = a.notificationService.PublishToUser(ctx, &usecase.InternalPublishNotificationInput{
		UserID:   reminder.PatientID,
		Type:     domain.NotificationTypeReminder,
		Title:    title,
		Body:     body,
		Data:     payload,
		DedupKey: fmt.Sprintf("reminder:%s:%s", reminder.ID.Hex(), scheduledAt.UTC().Format(time.RFC3339)),
	})
	if err != nil {
		log.Printf("[WARN] failed to publish reminder push (non-fatal) for reminder=%s: %v", reminder.ID.Hex(), err)
		return false, nil
	}

	return false, nil
}

func (a *ReminderActivity) UpdateReminderStatusActivity(ctx context.Context, reminderID string, status domain.ReminderStatus) error {
	id, err := util.MustHexToObjectID(reminderID)
	if err != nil {
		return err
	}

	_, err = a.reminderRepo.UpdateStatusByID(ctx, id, status)
	if err != nil {
		return err
	}
	return nil
}
