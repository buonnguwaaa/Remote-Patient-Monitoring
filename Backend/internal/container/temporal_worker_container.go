package container

import (
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
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

	// The worker deliberately does NOT read through the cache-aside layer
	// (see internal/cache and internal/repository/cached_*_repository.go) -
	// that's only wired into the HTTP server container for GET APIs. The
	// worker always reads/writes MongoDB directly, so it never sees stale
	// cached data and never needs to worry about invalidation.
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

	fieldCrypto, err := util.LoadFieldEncryptorFromEnv()
	if err != nil {
		log.Fatalf("[FATAL] field encryption: %v", err)
	}
	c.MessageRepo = chatRepository.NewEncryptedMessageRepository(chatRepository.NewMessageRepository(db), fieldCrypto)

	return c
}
