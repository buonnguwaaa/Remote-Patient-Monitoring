package assignments

import (
	"time"
)

type Threshold struct {
	SysMax     float64 `json:"sysMax,omitempty" bson:"sysMax,omitempty"`
	DiaMax     float64 `json:"diaMax,omitempty" bson:"diaMax,omitempty"`
	GlucoseMax float64 `json:"glucoseMax,omitempty" bson:"glucoseMax,omitempty"`
	PulseMax   float64 `json:"pulseMax,omitempty" bson:"pulseMax,omitempty"`
}

type Assignment struct {
	ID                string     `json:"id" bson:"_id,omitempty"`
	PatientID         string     `json:"patientId" bson:"patientId"`
	DoctorID          string     `json:"doctorId" bson:"doctorId"`
	CurrentThresholds *Threshold `json:"currentThresholds,omitempty" bson:"currentThresholds,omitempty"`
	CreatedAt         time.Time  `json:"createdAt" bson:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt" bson:"updatedAt"`
}
