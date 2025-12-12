package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type AlertResponse struct {
	ID             string                      `json:"id"`
	PatientID      string                      `json:"patient_id"`
	MeasurementID  string                      `json:"measurement_id"`
	Violations     []domain.ThresholdViolation `json:"violations"`
	Status         domain.Status               `json:"status"`
	Severity       domain.Severity             `json:"severity"`
	AcknowledgedBy *string                     `json:"acknowledgedBy,omitempty"`
	AcknowledgedAt *time.Time                  `json:"acknowledgedAt,omitempty"`
	CreatedAt      time.Time                   `json:"createdAt"`
	UpdatedAt      time.Time                   `json:"updatedAt"`
}
