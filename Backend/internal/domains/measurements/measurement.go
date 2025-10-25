package measurement

import (
	"time"
)

type MeasurementType string

const (
	TypeBloodPressure MeasurementType = "bp"
	TypeGlucose       MeasurementType = "glucose"
)

type Timing string

const (
	TimingPre  Timing = "pre"
	TimingPost Timing = "post"
)

type Measurement struct {
	ID         string          `json:"id" bson:"_id,omitempty"`
	PatientID  string          `json:"patientId" bson:"patientId"`
	Type       MeasurementType `json:"type" bson:"type"`
	Systolic   *float64        `json:"systolic,omitempty" bson:"systolic,omitempty"`
	Diastolic  *float64        `json:"diastolic,omitempty" bson:"diastolic,omitempty"`
	Pulse      *float64        `json:"pulse,omitempty" bson:"pulse,omitempty"`
	Glucose    *float64        `json:"glucose,omitempty" bson:"glucose,omitempty"`
	Timing     *Timing         `json:"timing,omitempty" bson:"timing,omitempty"`
	Unit       string          `json:"unit,omitempty" bson:"unit,omitempty"`
	Device     string          `json:"device,omitempty" bson:"device,omitempty"`
	Note       string          `json:"note,omitempty" bson:"note,omitempty"`
	MeasuredAt time.Time       `json:"measuredAt" bson:"measuredAt"`
	CreatedAt  time.Time       `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt" bson:"updatedAt"`
}
