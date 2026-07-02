package domain

import (
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PrescriptionStatus string

const (
	PrescriptionStatusActive       PrescriptionStatus = "active"
	PrescriptionStatusCompleted    PrescriptionStatus = "completed"
	PrescriptionStatusDiscontinued PrescriptionStatus = "discontinued"
)

type TimeOfDay string

const (
	TimeOfDayMorning TimeOfDay = "morning"
	TimeOfDayNoon    TimeOfDay = "noon"
	TimeOfDayEvening TimeOfDay = "evening"
)

// MedicationDose is one intake slot (e.g. 1 pill in the morning before breakfast).
// TimeOfDay is required. Hour and Minute are optional custom times within that bucket;
// when omitted, DefaultClockForTimeOfDay applies (08:00 / 12:00 / 18:00).
type MedicationDose struct {
	TimeOfDay  TimeOfDay  `json:"timeOfDay" bson:"timeOfDay"`
	Hour       *int       `json:"hour,omitempty" bson:"hour,omitempty"`
	Minute     *int       `json:"minute,omitempty" bson:"minute,omitempty"`
	MealTiming MealTiming `json:"mealTiming,omitempty" bson:"mealTiming,omitempty"`
	PillCount  float64    `json:"pillCount" bson:"pillCount"`
}

func (d MedicationDose) Matches(other MedicationDose) bool {
	return d.TimeOfDay == other.TimeOfDay &&
		d.MealTiming == other.MealTiming &&
		d.PillCount == other.PillCount &&
		DoseClockMatches(d, other)
}

// PrescriptionMedication is a single drug within a prescription, with its own schedule.
type PrescriptionMedication struct {
	DrugName     string           `json:"drugName" bson:"drugName"`
	Dosage       string           `json:"dosage" bson:"dosage"`
	Route        string           `json:"route,omitempty" bson:"route,omitempty"`
	Instructions string           `json:"instructions,omitempty" bson:"instructions,omitempty"`
	Schedule     []MedicationDose `json:"schedule" bson:"schedule"`
}

type Prescription struct {
	ID           primitive.ObjectID       `json:"id" bson:"_id,omitempty"`
	PatientID    primitive.ObjectID       `json:"patientId" bson:"patientId"`
	PrescribedBy primitive.ObjectID       `json:"prescribedBy" bson:"prescribedBy"`
	Medications  []PrescriptionMedication `json:"medications" bson:"medications"`
	Timezone     string                   `json:"timezone" bson:"timezone"`
	DaysOfWeek   []int                    `json:"daysOfWeek" bson:"daysOfWeek"`
	StartDate    time.Time                `json:"startDate" bson:"startDate"`
	EndDate      *time.Time               `json:"endDate,omitempty" bson:"endDate,omitempty"`
	Status       PrescriptionStatus       `json:"status" bson:"status"`
	CreatedAt    time.Time                `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time                `json:"updatedAt" bson:"updatedAt"`
}

// PrescriptionEffectiveEndDate returns the inclusive end boundary for scheduling.
// When EndDate is nil, a one-year course from StartDate is assumed.
func PrescriptionEffectiveEndDate(end *time.Time, start time.Time) time.Time {
	if end != nil {
		return end.UTC()
	}
	return start.UTC().AddDate(1, 0, 0)
}

// IsPrescriptionOpen reports whether the prescription is currently in effect by status and date range.
func IsPrescriptionOpen(p *Prescription, now time.Time) bool {
	if p == nil || p.Status != PrescriptionStatusActive {
		return false
	}

	now = now.UTC()
	start := p.StartDate.UTC()
	if now.Before(start) {
		return false
	}

	return now.Before(PrescriptionEffectiveEndDate(p.EndDate, p.StartDate))
}

// ValidatePrescriptionStatus rejects unknown or derived-only status values.
func ValidatePrescriptionStatus(status PrescriptionStatus) error {
	switch status {
	case PrescriptionStatusActive, PrescriptionStatusCompleted, PrescriptionStatusDiscontinued:
		return nil
	default:
		return fmt.Errorf("trạng thái đơn thuốc không hợp lệ: %s", status)
	}
}

// ReminderStatusForPrescription maps prescription status to the reminder status applied
// when a prescription status changes. This is one-way: reminder changes do not affect prescriptions.
func ReminderStatusForPrescription(status PrescriptionStatus) (ReminderStatus, bool) {
	switch status {
	case PrescriptionStatusActive:
		return ReminderStatusActive, true
	case PrescriptionStatusCompleted:
		return ReminderStatusExpired, true
	case PrescriptionStatusDiscontinued:
		return ReminderStatusCanceled, true
	default:
		return "", false
	}
}
