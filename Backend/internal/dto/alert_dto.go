package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type AlertResponse struct {
	ID                 string                      `json:"id"`
	PatientID          string                      `json:"patientId"`
	PatientName        string                      `json:"patientName,omitempty"`
	PatientAvatarURL   string                      `json:"patientAvatarUrl,omitempty"`
	MeasurementID      string                      `json:"measurementId"`
	Violations         []domain.ThresholdViolation `json:"violations"`
	Status             domain.Status               `json:"status"`
	Severity           domain.Severity             `json:"severity"`
	AcknowledgedBy     *string                     `json:"acknowledgedBy,omitempty"`
	AcknowledgedByName *string                     `json:"acknowledgedByName,omitempty"`
	AcknowledgedAt     *time.Time                  `json:"acknowledgedAt,omitempty"`
	CreatedAt          time.Time                   `json:"createdAt"`
	UpdatedAt          time.Time                   `json:"updatedAt"`
}
