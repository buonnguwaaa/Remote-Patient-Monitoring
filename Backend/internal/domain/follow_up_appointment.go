package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FollowUpAppointmentStatus string

const (
	FollowUpAppointmentStatusScheduled FollowUpAppointmentStatus = "scheduled"
	FollowUpAppointmentStatusCompleted FollowUpAppointmentStatus = "completed"
	FollowUpAppointmentStatusCanceled  FollowUpAppointmentStatus = "canceled"
)

type FollowUpAppointment struct {
	ID          primitive.ObjectID        `json:"id" bson:"_id,omitempty"`
	PatientID   primitive.ObjectID        `json:"patientId" bson:"patientId"`
	DoctorID    primitive.ObjectID        `json:"doctorId" bson:"doctorId"`
	ScheduledAt time.Time                 `json:"scheduledAt" bson:"scheduledAt"`
	Timezone    string                    `json:"timezone" bson:"timezone"`
	Location    string                    `json:"location,omitempty" bson:"location,omitempty"`
	Notes       string                    `json:"notes,omitempty" bson:"notes,omitempty"`
	Status      FollowUpAppointmentStatus `json:"status" bson:"status"`
	CreatedBy   primitive.ObjectID        `json:"createdBy" bson:"createdBy"`
	CreatedAt   time.Time                 `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time                 `json:"updatedAt" bson:"updatedAt"`
}
