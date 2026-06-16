package container

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
)

type TemporalWorkerContainer struct {
	MeasurementRepo         repository.MeasurementRepository
	ThresholdRepo           repository.ThresholdRepository
	AlertRepo               repository.AlertRepository
	ReminderRepo            repository.ReminderRepository
	PrescriptionRepo        repository.PrescriptionRepository
	MedicationIntakeRepo    repository.MedicationIntakeRepository
	FollowUpAppointmentRepo repository.FollowUpAppointmentRepository
	AssignmentRepo          repository.AssignmentRepository
	ConversationRepo        chatRepository.ConversationRepository
	MessageRepo             chatRepository.MessageRepository
	NotificationTokenRepo   repository.NotificationTokenRepository
	NotificationRepo        repository.UserNotificationRepository
	NotificationService     service.NotificationService
}

func NewTemporalWorkerContainer(pushProvider service.PushProvider) *TemporalWorkerContainer {
	c := &TemporalWorkerContainer{}

	db := config.Mongo.Database
	c.MeasurementRepo = repository.NewMeasurementRepository(db)
	c.ThresholdRepo = repository.NewThresholdRepository(db)
	c.AlertRepo = repository.NewAlertRepository(db)
	c.ReminderRepo = repository.NewReminderRepository(db)
	c.PrescriptionRepo = repository.NewPrescriptionRepository(db)
	c.MedicationIntakeRepo = repository.NewMedicationIntakeRepository(db)
	c.FollowUpAppointmentRepo = repository.NewFollowUpAppointmentRepository(db)
	c.NotificationTokenRepo = repository.NewNotificationTokenRepository(db)
	c.NotificationRepo = repository.NewUserNotificationRepository(db)
	c.NotificationService = service.NewNotificationService(c.NotificationTokenRepo, c.NotificationRepo, pushProvider)
	c.AssignmentRepo = repository.NewAssignmentRepository(db)
	c.ConversationRepo = chatRepository.NewConversationRepository(db)
	c.MessageRepo = chatRepository.NewMessageRepository(db)

	return c
}
