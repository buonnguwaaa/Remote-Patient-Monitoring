package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateMeasurementRequest struct {
	PatientID string `json:"patientId" validate:"required"`

	Type domain.MeasurementType `json:"type" validate:"required,oneof=bp glucose"`

	// Optional depending on Type
	Systolic  *float64       `json:"systolic,omitempty"`
	Diastolic *float64       `json:"diastolic,omitempty"`
	Pulse     *float64       `json:"pulse,omitempty"`
	Glucose   *float64       `json:"glucose,omitempty"`
	Timing    *domain.Timing `json:"timing,omitempty" validate:"omitempty,oneof=pre post"`

	Unit   string  `json:"unit,omitempty"`
	Device *string `json:"device,omitempty"`
	Note   *string `json:"note,omitempty"`
}

type UpdateMeasurementRequest struct {
	Type domain.MeasurementType `json:"type,omitempty" validate:"omitempty,oneof=bp glucose"`

	Systolic  *float64       `json:"systolic,omitempty"`
	Diastolic *float64       `json:"diastolic,omitempty"`
	Pulse     *float64       `json:"pulse,omitempty"`
	Glucose   *float64       `json:"glucose,omitempty"`
	Timing    *domain.Timing `json:"timing,omitempty" validate:"omitempty,oneof=pre post"`

	Unit   string  `json:"unit,omitempty"`
	Device *string `json:"device,omitempty"`
	Note   *string `json:"note,omitempty"`
}

type MeasurementResponse struct {
	ID        string                 `json:"id" bson:"_id,omitempty"`
	PatientID string                 `json:"patientId" bson:"patientId"`
	Type      domain.MeasurementType `json:"type" bson:"type"`
	Systolic  *float64               `json:"systolic,omitempty" bson:"systolic,omitempty"`
	Diastolic *float64               `json:"diastolic,omitempty" bson:"diastolic,omitempty"`
	Pulse     *float64               `json:"pulse,omitempty" bson:"pulse,omitempty"`
	Glucose   *float64               `json:"glucose,omitempty" bson:"glucose,omitempty"`
	Timing    *domain.Timing         `json:"timing,omitempty" bson:"timing,omitempty"`
	Unit      string                 `json:"unit,omitempty" bson:"unit,omitempty"`
	Device    *string                `json:"device,omitempty" bson:"device,omitempty"`
	Note      *string                `json:"note,omitempty" bson:"note,omitempty"`
	CreatedAt time.Time              `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time              `json:"updatedAt" bson:"updatedAt"`
}
