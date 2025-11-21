package domain

import (
	"time"
)

type Threshold struct {
	ID            string     `json:"id" bson:"_id,omitempty"`
	PatientID     string     `json:"patientId" bson:"patientId"`
	DoctorID      string     `json:"doctorId" bson:"doctorId"`
	SysMax        float64    `json:"sysMax,omitempty" bson:"sysMax,omitempty"`
	DiaMax        float64    `json:"diaMax,omitempty" bson:"diaMax,omitempty"`
	PulseMax      float64    `json:"pulseMax,omitempty" bson:"pulseMax,omitempty"`
	GlucoseMax    float64    `json:"glucoseMax,omitempty" bson:"glucoseMax,omitempty"`
	EffectiveFrom time.Time  `json:"effectiveFrom" bson:"effectiveFrom"`
	EffectiveTo   *time.Time `json:"effectiveTo,omitempty" bson:"effectiveTo,omitempty"`
	CreatedAt     time.Time  `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt" bson:"updatedAt"`
}
