package usecase

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type CreateReminderInput struct {
	PatientID      string
	Kind           domain.Kind
	Message        string
	Times          []domain.ReminderTime
	DaysOfWeek     []int
	Timezone       string
	StartDate      time.Time
	EndDate        time.Time
	CreatedBy      string
	PrescriptionID string
	TimeOfDay      *domain.TimeOfDay
	MealTiming     *domain.MealTiming
}

type GetRemindersInput struct {
	PatientID string
	Status    domain.ReminderStatus
	Kind      domain.Kind
	IsLatest  bool
}

type GetMyRemindersInput struct {
	UserID    string
	Role      userDomain.Role
	PatientID string
	Status    domain.ReminderStatus
	Kind      domain.Kind
}

type UpdateReminderInput struct {
	ID      string
	Message string

	Times      []domain.ReminderTime
	DaysOfWeek []int

	Timezone string

	Status domain.ReminderStatus

	StartDate time.Time
	EndDate   time.Time
}

type UpdateReminderStatusInput struct {
	ID     string
	Status domain.ReminderStatus
}
