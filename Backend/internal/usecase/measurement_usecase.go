package usecase

import "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

type CreateMeasurementInput struct {
	PatientID string                 `json:"patientId"`
	Type      domain.MeasurementType `json:"type"`

	Systolic  *float64 `json:"systolic,omitempty"`
	Diastolic *float64 `json:"diastolic,omitempty"`
	Pulse     *float64 `json:"pulse,omitempty"`

	Glucose *float64       `json:"glucose,omitempty"`
	Timing  *domain.Timing `json:"timing,omitempty"`

	Unit   string  `json:"unit,omitempty"`
	Device *string `json:"device,omitempty"`
	Note   *string `json:"note,omitempty"`
}

type UpdateMeasurementInput struct {
	ID string `json:"id"`

	Type *domain.MeasurementType `json:"type,omitempty"`

	Systolic  *float64 `json:"systolic,omitempty"`
	Diastolic *float64 `json:"diastolic,omitempty"`
	Pulse     *float64 `json:"pulse,omitempty"`

	Glucose *float64       `json:"glucose,omitempty"`
	Timing  *domain.Timing `json:"timing,omitempty"`

	Unit   *string `json:"unit,omitempty"`
	Device *string `json:"device,omitempty"`
	Note   *string `json:"note,omitempty"`
}
