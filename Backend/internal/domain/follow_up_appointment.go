package domain

import (
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	DefaultAppointmentDurationMinutes = 30
	MinAppointmentDurationMinutes     = 10
	MaxAppointmentDurationMinutes     = 180
)

var ErrInvalidAppointmentDuration = errors.New("invalid appointment duration")

type FollowUpAppointmentStatus string

const (
	FollowUpAppointmentStatusScheduled FollowUpAppointmentStatus = "scheduled"
	FollowUpAppointmentStatusCompleted FollowUpAppointmentStatus = "completed"
	FollowUpAppointmentStatusCanceled  FollowUpAppointmentStatus = "canceled"
)

type FollowUpAppointment struct {
	ID              primitive.ObjectID        `json:"id" bson:"_id,omitempty"`
	PatientID       primitive.ObjectID        `json:"patientId" bson:"patientId"`
	DoctorID        primitive.ObjectID        `json:"doctorId" bson:"doctorId"`
	ScheduledAt     time.Time                 `json:"scheduledAt" bson:"scheduledAt"`
	DurationMinutes int                       `json:"durationMinutes" bson:"durationMinutes"`
	Timezone        string                    `json:"timezone" bson:"timezone"`
	Location        string                    `json:"location,omitempty" bson:"location,omitempty"`
	Notes           string                    `json:"notes,omitempty" bson:"notes,omitempty"`
	Status          FollowUpAppointmentStatus `json:"status" bson:"status"`
	CreatedBy       primitive.ObjectID        `json:"createdBy" bson:"createdBy"`
	CreatedAt       time.Time                 `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time                 `json:"updatedAt" bson:"updatedAt"`
}

func (a FollowUpAppointment) EffectiveDurationMinutes() int {
	return NormalizeAppointmentDuration(a.DurationMinutes)
}

func NormalizeAppointmentDuration(minutes int) int {
	if minutes <= 0 {
		return DefaultAppointmentDurationMinutes
	}
	return minutes
}

func ValidateAppointmentDuration(minutes int) error {
	if minutes < MinAppointmentDurationMinutes || minutes > MaxAppointmentDurationMinutes {
		return fmt.Errorf("%w: must be between %d and %d minutes", ErrInvalidAppointmentDuration, MinAppointmentDurationMinutes, MaxAppointmentDurationMinutes)
	}
	return nil
}

// NormalizeAppointmentSlot truncates scheduledAt to minute precision in UTC.
func NormalizeAppointmentSlot(t time.Time) time.Time {
	u := t.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), u.Hour(), u.Minute(), 0, 0, time.UTC)
}

func AppointmentSlotEnd(scheduledAt time.Time, durationMinutes int) time.Time {
	return NormalizeAppointmentSlot(scheduledAt).Add(time.Duration(NormalizeAppointmentDuration(durationMinutes)) * time.Minute)
}

// AppointmentsOverlap reports whether two scheduled slots occupy the same doctor time.
func AppointmentsOverlap(aStart time.Time, aDurationMinutes int, bStart time.Time, bDurationMinutes int) bool {
	a := NormalizeAppointmentSlot(aStart)
	b := NormalizeAppointmentSlot(bStart)
	aEnd := AppointmentSlotEnd(a, aDurationMinutes)
	bEnd := AppointmentSlotEnd(b, bDurationMinutes)

	return a.Before(bEnd) && b.Before(aEnd)
}
