package usecase

import "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

type CreateMeasurementInput struct {
	PatientID string
	Type      domain.MeasurementType

	Systolic  *float64
	Diastolic *float64
	Pulse     *float64

	Glucose *float64
	Timing  *domain.Timing

	Unit   string
	Device *string
	Note   *string
}

type UpdateMeasurementInput struct {
	ID string

	Type domain.MeasurementType

	Systolic  *float64
	Diastolic *float64
	Pulse     *float64

	Glucose *float64
	Timing  *domain.Timing
	Unit    string
	Device  *string
	Note    *string
}

type GetMeasurementsInput struct {
	PatientID string
	Type      string
	Timing    string
	IsLatest  bool
}
