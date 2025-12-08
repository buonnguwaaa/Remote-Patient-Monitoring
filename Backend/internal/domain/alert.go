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

type Alert struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID       primitive.ObjectID `json:"patientId" bson:"patientId"`
	DoctorID        primitive.ObjectID `json:"doctorId" bson:"doctorId"`
	MeasurementID   primitive.ObjectID `json:"measurementId" bson:"measurementId"`
	Type            string             `json:"type" bson:"type"`
	Rule            string             `json:"rule" bson:"rule"`
	Observed        float64            `json:"observed" bson:"observed"`
	ThresholdAtTime float64            `json:"thresholdAtTime" bson:"thresholdAtTime"`
	Severity        Severity           `json:"severity" bson:"severity"`
	Status          Status             `json:"status" bson:"status"`
	AcknowledgedBy  *string            `json:"acknowledgedBy,omitempty" bson:"acknowledgedBy,omitempty"`
	AcknowledgedAt  *time.Time         `json:"acknowledgedAt,omitempty" bson:"acknowledgedAt,omitempty"`
	CreatedAt       time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updatedAt"`
}
