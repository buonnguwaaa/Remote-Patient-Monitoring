package container

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
)

type TemporalWorkerContainer struct {
	MeasurementRepo       repository.MeasurementRepository
	ThresholdRepo         repository.ThresholdRepository
	AlertRepo             repository.AlertRepository
	ReminderRepo          repository.ReminderRepository
	NotificationTokenRepo repository.NotificationTokenRepository
	NotificationRepo      repository.UserNotificationRepository
	NotificationService   service.NotificationService
}

func NewTemporalWorkerContainer(pushProvider service.PushProvider) *TemporalWorkerContainer {
	c := &TemporalWorkerContainer{}

	db := config.Mongo.Database
	c.MeasurementRepo = repository.NewMeasurementRepository(db)
	c.ThresholdRepo = repository.NewThresholdRepository(db)
	c.AlertRepo = repository.NewAlertRepository(db)
	c.ReminderRepo = repository.NewReminderRepository(db)
	c.NotificationTokenRepo = repository.NewNotificationTokenRepository(db)
	c.NotificationRepo = repository.NewUserNotificationRepository(db)
	c.NotificationService = service.NewNotificationService(c.NotificationTokenRepo, c.NotificationRepo, pushProvider)

	return c
}
