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

type BloodPressure struct {
	Systolic  float64  `json:"systolic,omitempty" bson:"systolic,omitempty"`
	Diastolic float64  `json:"diastolic,omitempty" bson:"diastolic,omitempty"`
	MAP       *float64 `json:"map,omitempty" bson:"map,omitempty"`
	Salt      *float64 `json:"salt,omitempty" bson:"salt,omitempty"`
}

type Glucose struct {
	BloodGlucose *float64 `json:"bloodGlucose,omitempty" bson:"bloodGlucose,omitempty"` // mg/dL
	HbA1c        *float64 `json:"hba1c,omitempty" bson:"hba1c,omitempty"`               // %
}

func (g Glucose) HasData() bool {
	return g.BloodGlucose != nil || g.HbA1c != nil
}

type Measurement struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID primitive.ObjectID `json:"patientId" bson:"patientId"`

	Temperature     float64       `json:"temperature" bson:"temperature"`         // °C
	HeartRate       float64       `json:"heartRate" bson:"heartRate"`             // bpm
	RespiratoryRate float64       `json:"respiratoryRate" bson:"respiratoryRate"` // breaths/min
	SpO2            float64       `json:"spo2" bson:"spo2"`                       // % oxygen saturation
	BloodPressure   BloodPressure `json:"bloodPressure" bson:"bloodPressure"`

	Height *float64 `json:"height,omitempty" bson:"height,omitempty"` // cm
	Weight *float64 `json:"weight,omitempty" bson:"weight,omitempty"` // kg
	BMI    *float64 `json:"bmi,omitempty" bson:"bmi,omitempty"`

	Type       MeasurementType `json:"type" bson:"type"`
	Glucose    Glucose         `json:"glucose,omitempty" bson:"glucose,omitempty"`
	MealTiming *MealTiming     `json:"mealTiming,omitempty" bson:"mealTiming,omitempty"`
	Device     *string         `json:"device,omitempty" bson:"device,omitempty"`
	Note       *string         `json:"note,omitempty" bson:"note,omitempty"`
	CreatedAt  time.Time       `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt" bson:"updatedAt"`
}
