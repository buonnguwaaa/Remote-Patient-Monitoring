package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateMeasurementRequest struct {
	PatientID string                 `json:"patientId" validate:"required"`
	Type      domain.MeasurementType `json:"type" validate:"required,oneof=bp glucose"`

	Temperature     float64              `json:"temperature"`
	HeartRate       float64              `json:"heartRate"`
	RespiratoryRate float64              `json:"respiratoryRate"`
	SpO2            float64              `json:"spo2"`
	BloodPressure   domain.BloodPressure `json:"bloodPressure"`

	Glucose *float64       `json:"glucose,omitempty"`
	Timing  *domain.Timing `json:"timing,omitempty" validate:"omitempty,oneof=pre post"`
	Device  *string        `json:"device,omitempty"`
	Note    *string        `json:"note,omitempty"`
}

type UpdateMeasurementRequest struct {
	Type domain.MeasurementType `json:"type,omitempty" validate:"omitempty,oneof=bp glucose"`

	Temperature     float64 `json:"temperature,omitempty"`
	HeartRate       float64 `json:"heartRate,omitempty"`
	RespiratoryRate float64 `json:"respiratoryRate,omitempty"`
	SpO2            float64 `json:"spo2,omitempty"`

	BloodPressure domain.BloodPressure `json:"bloodPressure,omitempty"`

	Glucose *float64       `json:"glucose,omitempty"`
	Timing  *domain.Timing `json:"timing,omitempty"`
	Device  *string        `json:"device,omitempty"`
	Note    *string        `json:"note,omitempty"`
}

type MeasurementResponse struct {
	ID        string `json:"id"`
	PatientID string `json:"patientId"`

	Temperature     float64              `json:"temperature"`
	HeartRate       float64              `json:"heartRate"`
	RespiratoryRate float64              `json:"respiratoryRate"`
	SpO2            float64              `json:"spo2"`
	BloodPressure   domain.BloodPressure `json:"bloodPressure"`

	Type      domain.MeasurementType `json:"type"`
	Systolic  *float64               `json:"systolic,omitempty"`
	Diastolic *float64               `json:"diastolic,omitempty"`
	Glucose   *float64               `json:"glucose,omitempty"`
	Timing    *domain.Timing         `json:"timing,omitempty"`

	Device *string `json:"device,omitempty"`
	Note   *string `json:"note,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
