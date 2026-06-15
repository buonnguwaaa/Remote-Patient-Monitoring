package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Kind string

const (
	KindMeasure    Kind = "measure"
	KindMedication Kind = "medication"
)

type ReminderStatus string

const (
	ReminderStatusActive   ReminderStatus = "active"
	ReminderStatusPaused   ReminderStatus = "paused"
	ReminderStatusExpired  ReminderStatus = "expired"
	ReminderStatusCanceled ReminderStatus = "canceled"
)

type Reminder struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID primitive.ObjectID `json:"patientId" bson:"patientId"`
	Kind      Kind               `json:"kind" bson:"kind"`
	Message   string             `json:"message" bson:"message"`

	Hour       int   `json:"hour" bson:"hour"`             // 0–23
	Minute     int   `json:"minute" bson:"minute"`         // 0–59
	DaysOfWeek []int `json:"daysOfWeek" bson:"daysOfWeek"` // 0=Sunday..6=Saturday

	Timezone string `json:"timezone" bson:"timezone"`

	Status ReminderStatus `json:"status" bson:"status"`

	StartDate time.Time `json:"startDate" bson:"startDate"`
	EndDate   time.Time `json:"endDate" bson:"endDate"`

	PrescriptionID *primitive.ObjectID `json:"prescriptionId,omitempty" bson:"prescriptionId,omitempty"`
	TimeOfDay      *TimeOfDay          `json:"timeOfDay,omitempty" bson:"timeOfDay,omitempty"`
	MealTiming     *MealTiming         `json:"mealTiming,omitempty" bson:"mealTiming,omitempty"`

	CreatedBy primitive.ObjectID `json:"createdBy" bson:"createdBy"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt"`
}
