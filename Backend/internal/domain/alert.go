package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Severity string

const (
	SeverityInfo Severity = "info"
	SeverityHigh Severity = "high"
)

type Status string

const (
	StatusOpen Status = "open"
	StatusAck  Status = "ack"
)

type ThresholdViolation struct {
	Type      string   `json:"type" bson:"type"`           // "temperature" | "spo2" | "heartRate"...
	Rule      string   `json:"rule" bson:"rule"`           // "temperature_max"
	Observed  float64  `json:"observed" bson:"observed"`   // 40
	Threshold float64  `json:"threshold" bson:"threshold"` // 38
	Severity  Severity `json:"severity" bson:"severity"`   // high
}

type Alert struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID     primitive.ObjectID `json:"patientId" bson:"patientId"`
	MeasurementID primitive.ObjectID `json:"measurementId" bson:"measurementId"`

	Violations []ThresholdViolation `json:"violations" bson:"violations"`

	Status         Status              `json:"status" bson:"status"`
	Severity       Severity            `json:"severity" bson:"severity"` // overall severity
	AcknowledgedBy *primitive.ObjectID `json:"acknowledgedBy,omitempty" bson:"acknowledgedBy,omitempty"`
	AcknowledgedAt *time.Time          `json:"acknowledgedAt,omitempty" bson:"acknowledgedAt,omitempty"`
	CreatedAt      time.Time           `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time           `json:"updatedAt" bson:"updatedAt"`
}
