package domain

import (
	"time"
)

type Assignment struct {
	ID                string     `json:"id" bson:"_id,omitempty"`
	PatientID         string     `json:"patientId" bson:"patientId"`
	DoctorID          string     `json:"doctorId" bson:"doctorId"`
	CurrentThresholds *Threshold `json:"currentThresholds,omitempty" bson:"currentThresholds,omitempty"`
	CreatedAt         time.Time  `json:"createdAt" bson:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt" bson:"updatedAt"`
}
