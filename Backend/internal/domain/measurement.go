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
	Systolic  *float64 `json:"systolic,omitempty" bson:"systolic,omitempty"`
	Diastolic *float64 `json:"diastolic,omitempty" bson:"diastolic,omitempty"`
	MAP       *float64 `json:"map,omitempty" bson:"map,omitempty"`
}

type Measurement struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID primitive.ObjectID `json:"patientId" bson:"patientId"`

	Temperature     *float64 `json:"temperature,omitempty" bson:"temperature,omitempty"`
	HeartRate       *float64 `json:"heartRate,omitempty" bson:"heartRate,omitempty"`
	RespiratoryRate *float64 `json:"respiratoryRate,omitempty" bson:"respiratoryRate,omitempty"`
	SpO2            *float64 `json:"spo2,omitempty" bson:"spo2,omitempty"`

	BloodPressure BloodPressure `json:"bloodPressure,omitempty" bson:"bloodPressure,omitempty"`

	Type       MeasurementType `json:"type" bson:"type"`
	Glucose    *float64        `json:"glucose,omitempty" bson:"glucose,omitempty"`
	MealTiming *MealTiming     `json:"mealTiming,omitempty" bson:"mealTiming,omitempty"`
	Device     *string         `json:"device,omitempty" bson:"device,omitempty"`
	Note       *string         `json:"note,omitempty" bson:"note,omitempty"`
	CreatedAt  time.Time       `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time       `json:"updatedAt" bson:"updatedAt"`
}
