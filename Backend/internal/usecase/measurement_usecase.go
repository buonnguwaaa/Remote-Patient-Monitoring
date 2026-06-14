package usecase

import "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

type CreateMeasurementInput struct {
	PatientID string
	Type      domain.MeasurementType

	Temperature     float64
	HeartRate       float64
	RespiratoryRate float64
	SpO2            float64
	BloodPressure   domain.BloodPressure

	Systolic   *float64
	Diastolic  *float64
	Glucose    *float64
	MealTiming *domain.MealTiming

	Device *string
	Note   *string
}

type UpdateMeasurementInput struct {
	ID   string
	Type domain.MeasurementType

	Temperature     float64
	HeartRate       float64
	RespiratoryRate float64
	BloodPressure   domain.BloodPressure
	SpO2            float64
	Systolic        *float64
	Diastolic       *float64
	Glucose         *float64
	MealTiming      *domain.MealTiming

	Device *string
	Note   *string
}

type GetMeasurementsInput struct {
	PatientID  string
	Type       string
	MealTiming string
	IsLatest   bool
}
