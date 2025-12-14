package usecase

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateReminderInput struct {
	PatientID  string
	Kind       domain.Kind
	Message    string
	Hour       int
	Minute     int
	DaysOfWeek []int
	Timezone   string
	StartDate  time.Time
	EndDate    time.Time
	CreatedBy  string
}

type GetRemindersInput struct {
	PatientID string
	Status    domain.ReminderStatus
	Kind      domain.Kind
	IsLatest  bool
}

type UpdateReminderInput struct {
	ID      string
	Message string

	Hour       int
	Minute     int
	DaysOfWeek []int

	Timezone string

	Status domain.ReminderStatus

	StartDate time.Time
	EndDate   time.Time
}
