package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateMedicationIntakeRequest struct {
	PrescriptionID string                `json:"prescriptionId" binding:"required"`
	DrugName       string                `json:"drugName" binding:"required"`
	Dose           MedicationDoseRequest `json:"dose" binding:"required"`
}

type MedicationIntakeResponse struct {
	ID             string                 `json:"id"`
	PatientID      string                 `json:"patientId"`
	PrescriptionID string                 `json:"prescriptionId"`
	DrugName       string                 `json:"drugName"`
	Dosage         string                 `json:"dosage"`
	Dose           MedicationDoseResponse `json:"dose"`
	ScheduledDate  time.Time              `json:"scheduledDate"`
	TakenAt        time.Time              `json:"takenAt"`
	CreatedAt      time.Time              `json:"createdAt"`
}

type TodayMedicationSlotResponse struct {
	MedicationDoseResponse
	Taken    bool   `json:"taken"`
	IntakeID string `json:"intakeId,omitempty"`
}

type TodayMedicationResponse struct {
	PrescriptionID string                        `json:"prescriptionId"`
	DrugName       string                        `json:"drugName"`
	Dosage         string                        `json:"dosage"`
	ExpectedToday  int                           `json:"expectedToday"`
	TakenToday     int                           `json:"takenToday"`
	Slots          []TodayMedicationSlotResponse `json:"slots"`
}

type MedicationAdherenceSlotStatus string

const (
	AdherenceSlotTaken   MedicationAdherenceSlotStatus = "taken"
	AdherenceSlotMissed  MedicationAdherenceSlotStatus = "missed"
	AdherenceSlotPending MedicationAdherenceSlotStatus = "pending"
)

type MedicationAdherenceSlotResponse struct {
	MedicationDoseResponse
	Status   MedicationAdherenceSlotStatus `json:"status"`
	IntakeID string                        `json:"intakeId,omitempty"`
	TakenAt  *time.Time                    `json:"takenAt,omitempty"`
}

type MedicationAdherenceMedicationResponse struct {
	PrescriptionID string                            `json:"prescriptionId"`
	DrugName       string                            `json:"drugName"`
	Dosage         string                            `json:"dosage"`
	Expected       int                               `json:"expected"`
	Taken          int                               `json:"taken"`
	Missed         int                               `json:"missed"`
	Slots          []MedicationAdherenceSlotResponse `json:"slots"`
}

type MedicationAdherenceDayResponse struct {
	Date        string                                  `json:"date"`
	Expected    int                                     `json:"expected"`
	Taken       int                                     `json:"taken"`
	Missed      int                                     `json:"missed"`
	Medications []MedicationAdherenceMedicationResponse `json:"medications"`
}

type MedicationAdherenceSummaryResponse struct {
	Expected      int     `json:"expected"`
	Taken         int     `json:"taken"`
	Missed        int     `json:"missed"`
	AdherenceRate float64 `json:"adherenceRate"`
}

type MedicationAdherenceResponse struct {
	From    string                             `json:"from"`
	To      string                             `json:"to"`
	Summary MedicationAdherenceSummaryResponse `json:"summary"`
	Days    []MedicationAdherenceDayResponse   `json:"days"`
}

func ToMedicationDoseResponse(dose domain.MedicationDose) MedicationDoseResponse {
	return MedicationDoseResponse{
		TimeOfDay:  dose.TimeOfDay,
		Hour:       dose.Hour,
		Minute:     dose.Minute,
		Time:       domain.FormatDoseClock(dose),
		MealTiming: dose.MealTiming,
		PillCount:  dose.PillCount,
	}
}
