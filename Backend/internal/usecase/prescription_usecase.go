package usecase

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type CreatePrescriptionInput struct {
	PatientID    string
	Medications  []domain.PrescriptionMedication
	Timezone     string
	DaysOfWeek   []int
	StartDate    time.Time
	EndDate      *time.Time
	PrescribedBy string
}

type GetPrescriptionsInput struct {
	PatientID string
	Status    domain.PrescriptionStatus
	IsLatest  bool
}

type GetPrescriptionByIDInput struct {
	ID     string
	UserID string
	Role   userDomain.Role
}

type UpdatePrescriptionInput struct {
	ID          string
	Medications []domain.PrescriptionMedication
	Timezone    string
	DaysOfWeek  []int
	StartDate   time.Time
	EndDate     *time.Time
	Status      domain.PrescriptionStatus
}

type UpdatePrescriptionStatusInput struct {
	ID     string
	Status domain.PrescriptionStatus
}
