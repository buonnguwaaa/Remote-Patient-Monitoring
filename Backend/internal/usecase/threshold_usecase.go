package usecase

import (
	"time"
)

type CreateThresholdInput struct {
	PatientID          string
	DoctorID           string
	TemperatureMin     float64
	TemperatureMax     float64
	HeartRateMin       float64
	HeartRateMax       float64
	RespiratoryRateMin float64
	RespiratoryRateMax float64
	SpO2Min            float64
	SysMin             float64
	SysMax             float64
	DiaMin             float64
	DiaMax             float64
	GlucoseMin         *float64
	GlucoseMax         *float64
	EffectiveFrom      time.Time
	EffectiveTo        *time.Time
}

type UpdateThresholdInput struct {
	ID                 string
	TemperatureMin     float64
	TemperatureMax     float64
	HeartRateMin       float64
	HeartRateMax       float64
	RespiratoryRateMin float64
	RespiratoryRateMax float64
	SpO2Min            float64
	SysMin             float64
	SysMax             float64
	DiaMin             float64
	DiaMax             float64
	GlucoseMin         *float64
	GlucoseMax         *float64
	EffectiveFrom      time.Time
	EffectiveTo        *time.Time
}

type DeleteThresholdInput struct {
	ID       string
	DoctorID string
}

type GetThresholdsInput struct {
	PatientID string
	DoctorID  string
	IsLatest  bool
}
