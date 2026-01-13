package container

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
)

type TemporalWorkerContainer struct {
	MeasurementRepo repository.MeasurementRepository
	ThresholdRepo   repository.ThresholdRepository
	AlertRepo       repository.AlertRepository
	ReminderRepo    repository.ReminderRepository
}

func NewTemporalWorkerContainer() *TemporalWorkerContainer {
	c := &TemporalWorkerContainer{}

	// Initialize repositories
	db := config.Mongo.Database
	c.MeasurementRepo = repository.NewMeasurementRepository(db)
	c.ThresholdRepo = repository.NewThresholdRepository(db)
	c.AlertRepo = repository.NewAlertRepository(db)
	c.ReminderRepo = repository.NewReminderRepository(db)

	return c
}
