package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateMeasurementRequest struct {
	PatientID string `json:"patientId" validate:"required"`

	Temperature     *float64             `json:"temperature,omitempty"`
	HeartRate       *float64             `json:"heartRate,omitempty"`
	RespiratoryRate *float64             `json:"respiratoryRate,omitempty"`
	SpO2            *float64             `json:"spo2,omitempty"`
	BloodPressure   domain.BloodPressure `json:"bloodPressure,omitempty"`

	Height *float64 `json:"height,omitempty"`
	Weight *float64 `json:"weight,omitempty"`

	Glucose    domain.Glucose     `json:"glucose"`
	MealTiming *domain.MealTiming `json:"mealTiming,omitempty" validate:"omitempty,oneof=pre_meal post_meal"`
	Device     *string            `json:"device,omitempty"`
	Note       *string            `json:"note,omitempty"`
}

type UpdateMeasurementRequest struct {
	Temperature     *float64 `json:"temperature,omitempty"`
	HeartRate       *float64 `json:"heartRate,omitempty"`
	RespiratoryRate *float64 `json:"respiratoryRate,omitempty"`
	SpO2            *float64 `json:"spo2,omitempty"`

	BloodPressure *domain.BloodPressure `json:"bloodPressure,omitempty"`

	Height *float64 `json:"height,omitempty"`
	Weight *float64 `json:"weight,omitempty"`

	Glucose    *domain.Glucose     `json:"glucose,omitempty"`
	MealTiming *domain.MealTiming `json:"mealTiming,omitempty"`
	Device     *string            `json:"device,omitempty"`
	Note       *string            `json:"note,omitempty"`
}

type MeasurementResponse struct {
	ID        string `json:"id"`
	PatientID string `json:"patientId"`

	Temperature     *float64 `json:"temperature,omitempty"`
	HeartRate       *float64 `json:"heartRate,omitempty"`
	RespiratoryRate *float64 `json:"respiratoryRate,omitempty"`
	SpO2            *float64 `json:"spo2,omitempty"`

	BloodPressure domain.BloodPressure `json:"bloodPressure,omitempty"`

	Height *float64 `json:"height,omitempty"`
	Weight *float64 `json:"weight,omitempty"`
	BMI    *float64 `json:"bmi,omitempty"`

	Glucose    domain.Glucose     `json:"glucose"`
	MealTiming *domain.MealTiming `json:"mealTiming,omitempty"`

	Device *string `json:"device,omitempty"`
	Note   *string `json:"note,omitempty"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
