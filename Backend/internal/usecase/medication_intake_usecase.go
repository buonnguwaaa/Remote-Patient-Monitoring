package usecase

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateMedicationIntakeInput struct {
	PatientID      string
	PrescriptionID string
	DrugName       string
	Dose           domain.MedicationDose
}

type GetTodayMedicationsInput struct {
	PatientID string
}

type GetMedicationAdherenceInput struct {
	PatientID string
	Days      int
	From      *time.Time
	To        *time.Time
}
