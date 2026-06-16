package usecase

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type CreateFollowUpAppointmentInput struct {
	PatientID   string
	DoctorID    string
	ScheduledAt time.Time
	Timezone    string
	Location    string
	Notes       string
	CreatedBy   string
	ActorRole   userDomain.Role
}

type GetFollowUpAppointmentsInput struct {
	PatientID string
	DoctorID  string
	NurseID   string
	Status    domain.FollowUpAppointmentStatus
	From      *time.Time
	To        *time.Time
}

type GetFollowUpAppointmentByIDInput struct {
	ID     string
	UserID string
	Role   userDomain.Role
}

type UpdateFollowUpAppointmentInput struct {
	ID          string
	ScheduledAt *time.Time
	Timezone    *string
	Location    *string
	Notes       *string
}

type UpdateFollowUpAppointmentStatusInput struct {
	ID     string
	Status domain.FollowUpAppointmentStatus
}
