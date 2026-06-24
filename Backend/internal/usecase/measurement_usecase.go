package usecase

import "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

type CreateMeasurementInput struct {
	PatientID string

	Temperature     *float64
	HeartRate       *float64
	RespiratoryRate *float64
	SpO2            *float64
	BloodPressure   domain.BloodPressure

	Height *float64
	Weight *float64

	Systolic   *float64
	Diastolic  *float64
	Glucose    domain.Glucose
	MealTiming *domain.MealTiming

	Device *string
	Note   *string
}

type UpdateMeasurementInput struct {
	ID string

	Temperature     *float64
	HeartRate       *float64
	RespiratoryRate *float64
	SpO2            *float64
	BloodPressure   *domain.BloodPressure
	Height          *float64
	Weight          *float64
	Systolic        *float64
	Diastolic       *float64
	Glucose         *domain.Glucose
	MealTiming      *domain.MealTiming

	Device *string
	Note   *string
}

type GetMeasurementsInput struct {
	PatientID  string
	MealTiming string
	IsLatest   bool
}
