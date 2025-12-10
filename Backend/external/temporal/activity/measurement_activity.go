package activity

import (
	"context"
	"fmt"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type ProcessingAlertActivity struct {
	measurementRepo repository.MeasurementRepository
	thresholdRepo   repository.ThresholdRepository
	alertRepo       repository.AlertRepository
	// notifier        Notifier
}

// type Notifier interface {
// 	NotifyAlert(ctx context.Context, alert *domain.Alert) error
// }

func NewProcessingAlertActivity(
	measurementRepo repository.MeasurementRepository,
	thresholdRepo repository.ThresholdRepository,
	alertRepo repository.AlertRepository,
	// notifier Notifier,
) *ProcessingAlertActivity {
	return &ProcessingAlertActivity{
		measurementRepo: measurementRepo,
		thresholdRepo:   thresholdRepo,
		alertRepo:       alertRepo,
		// notifier:        notifier,
	}
}

func (a *ProcessingAlertActivity) EvaluateAndSendAlertActivity(ctx context.Context, measurementID string, patientID string) (string, error) {
	measurementIDObj, err := util.MustHexToObjectID(measurementID)
	if err != nil {
		return "", fmt.Errorf("invalid measurement ID: %w", err)
	}
	measurement, err := a.measurementRepo.FindByID(ctx, measurementIDObj)
	if err != nil {
		return "", fmt.Errorf("failed to get measurement: %w", err)
	}
	if measurement == nil {
		return "", fmt.Errorf("measurement not found")
	}

	thresholds, err := a.thresholdRepo.Find(ctx, repository.ThresholdFilter{
		PatientID: patientID,
		IsLatest:  true,
	})
	if err != nil {
		return "", fmt.Errorf("failed to get thresholds: %w", err)
	}
	if len(thresholds) == 0 {
		return "", fmt.Errorf("no threshold set for patient")
	}

	violations := evaluateMeasurementAgainstThreshold(measurement, &thresholds[0])
	if len(violations) == 0 {
		return "no-violation", nil // No alert needed
	}

	now := time.Now().UTC()
	alert := &domain.Alert{
		PatientID:       measurement.PatientID,
		DoctorID:        thresholds[0].DoctorID,
		MeasurementID:   measurement.ID,
		Violations:      violations,
		Status:          domain.StatusOpen,
		Severity:        aggregateSeverity(violations),
		AcknowledgedBy:  nil,
		AcknowledgedAt:  nil,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if _, err := a.alertRepo.Create(ctx, alert); err != nil {
		return "", fmt.Errorf("failed to create alert: %w", err)
	}

	// TODO: Send push notification
	// if err := a.notifier.NotifyAlert(ctx, alert); err != nil {
	// 	return "created-notification-failed", fmt.Errorf("failed to notify alert: %w", err)
	// }

	// Print for local debugging
	fmt.Printf("Alert created for patient %s: %+v\n", patientID, alert)
	return "created-notification", nil
}
