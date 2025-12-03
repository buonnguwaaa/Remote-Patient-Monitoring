package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
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

type BloodPressure struct {
	Systolic  float64  `json:"systolic,omitempty" bson:"systolic,omitempty"`
	Diastolic float64  `json:"diastolic,omitempty" bson:"diastolic,omitempty"`
	MAP       *float64 `json:"map,omitempty" bson:"map,omitempty"`
}

type Measurement struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID primitive.ObjectID `json:"patientId" bson:"patientId"`

	Temperature     float64       `json:"temperature" bson:"temperature"`         // °C
	HeartRate       float64       `json:"heartRate" bson:"heartRate"`             // bpm
	RespiratoryRate float64       `json:"respiratoryRate" bson:"respiratoryRate"` // breaths/min
	SpO2            float64       `json:"spo2" bson:"spo2"`                       // % oxygen saturation
	BloodPressure   BloodPressure `json:"bloodPressure" bson:"bloodPressure"`

	Type      MeasurementType `json:"type" bson:"type"`
	Glucose   *float64        `json:"glucose,omitempty" bson:"glucose,omitempty"`
	Timing    *Timing         `json:"timing,omitempty" bson:"timing,omitempty"`
	Device    *string         `json:"device,omitempty" bson:"device,omitempty"`
	Note      *string         `json:"note,omitempty" bson:"note,omitempty"`
	CreatedAt time.Time       `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt" bson:"updatedAt"`
}
