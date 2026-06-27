package activity

import (
	"context"
	"fmt"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type AppointmentActivity struct {
	appointmentRepo     repository.FollowUpAppointmentRepository
	notificationService service.NotificationService
}

func NewAppointmentActivity(
	appointmentRepo repository.FollowUpAppointmentRepository,
	notificationService service.NotificationService,
) *AppointmentActivity {
	return &AppointmentActivity{
		appointmentRepo:     appointmentRepo,
		notificationService: notificationService,
	}
}

func (a *AppointmentActivity) GetAppointmentActivity(ctx context.Context, appointmentID string) (*domain.FollowUpAppointment, error) {
	id, err := util.MustHexToObjectID(appointmentID)
	if err != nil {
		return nil, err
	}
	return a.appointmentRepo.FindByID(ctx, id)
}

func (a *AppointmentActivity) SendAppointmentReminderActivity(ctx context.Context, appointmentID string) error {
	id, err := util.MustHexToObjectID(appointmentID)
	if err != nil {
		return err
	}

	appointment, err := a.appointmentRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if appointment == nil {
		return fmt.Errorf("appointment not found")
	}
	if appointment.Status != domain.FollowUpAppointmentStatusScheduled {
		return nil
	}
	if !appointment.ScheduledAt.After(time.Now().UTC()) {
		return nil
	}

	title := "Nhắc nhở tái khám"
	body := "Ngày mai bạn có lịch tái khám. Vui lòng chuẩn bị đến khám đúng giờ."

	payload := map[string]string{
		"type":          "appointment",
		"appointmentId": appointment.ID.Hex(),
		"patientId":     appointment.PatientID.Hex(),
		"doctorId":      appointment.DoctorID.Hex(),
		"scheduledFor":  appointment.ScheduledAt.UTC().Format(time.RFC3339),
		"targetScreen":  "PatientAppointments",
	}

	_, err = a.notificationService.PublishToUser(ctx, &usecase.InternalPublishNotificationInput{
		UserID:   appointment.PatientID,
		Type:     domain.NotificationTypeAppointment,
		Title:    title,
		Body:     body,
		Data:     payload,
		DedupKey: fmt.Sprintf("appointment:%s:reminder-1d", appointment.ID.Hex()),
	})
	if err != nil {
		log.Printf("[WARN] failed to publish appointment reminder (non-fatal) for appointment=%s: %v", appointment.ID.Hex(), err)
		return nil
	}

	return nil
}
