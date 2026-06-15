package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type MedicationDoseRequest struct {
	TimeOfDay  domain.TimeOfDay  `json:"timeOfDay" binding:"required,oneof=morning noon evening"`
	Hour       *int              `json:"hour" binding:"omitempty,min=0,max=23"`
	Minute     *int              `json:"minute" binding:"omitempty,min=0,max=59"`
	MealTiming domain.MealTiming `json:"mealTiming" binding:"omitempty,oneof=pre_meal post_meal"`
	PillCount  float64           `json:"pillCount" binding:"required,gt=0"`
}

type PrescriptionMedicationRequest struct {
	DrugName     string                  `json:"drugName" binding:"required"`
	Dosage       string                  `json:"dosage" binding:"required"`
	Route        string                  `json:"route"`
	Instructions string                  `json:"instructions"`
	Schedule     []MedicationDoseRequest `json:"schedule" binding:"required,min=1,dive"`
}

type CreatePrescriptionRequest struct {
	PatientID   string                          `json:"patientId" binding:"required"`
	Medications []PrescriptionMedicationRequest `json:"medications" binding:"required,min=1,dive"`
	Timezone    string                          `json:"timezone" binding:"required"`
	DaysOfWeek  []int                           `json:"daysOfWeek" binding:"required"`
	StartDate   time.Time                       `json:"startDate" binding:"required"`
	EndDate     *time.Time                      `json:"endDate"`
}

type UpdatePrescriptionRequest struct {
	Medications []PrescriptionMedicationRequest `json:"medications" binding:"required,min=1,dive"`
	Timezone    string                          `json:"timezone" binding:"required"`
	DaysOfWeek  []int                           `json:"daysOfWeek" binding:"required"`
	StartDate   time.Time                       `json:"startDate" binding:"required"`
	EndDate     *time.Time                      `json:"endDate"`
	Status      domain.PrescriptionStatus       `json:"status" binding:"required"`
}

type UpdatePrescriptionStatusRequest struct {
	Status domain.PrescriptionStatus `json:"status" binding:"required"`
}

type MedicationDoseResponse struct {
	TimeOfDay  domain.TimeOfDay  `json:"timeOfDay"`
	Hour       *int              `json:"hour,omitempty"`
	Minute     *int              `json:"minute,omitempty"`
	Time       string            `json:"time"`
	MealTiming domain.MealTiming `json:"mealTiming,omitempty"`
	PillCount  float64           `json:"pillCount"`
}

type PrescriptionMedicationResponse struct {
	DrugName     string                   `json:"drugName"`
	Dosage       string                   `json:"dosage"`
	Route        string                   `json:"route,omitempty"`
	Instructions string                   `json:"instructions,omitempty"`
	Schedule     []MedicationDoseResponse `json:"schedule"`
}

type PrescriptionResponse struct {
	ID           string                           `json:"id"`
	PatientID    string                           `json:"patientId"`
	PrescribedBy string                           `json:"prescribedBy"`
	Medications  []PrescriptionMedicationResponse `json:"medications"`
	Timezone     string                           `json:"timezone"`
	DaysOfWeek   []int                            `json:"daysOfWeek"`
	StartDate    time.Time                        `json:"startDate"`
	EndDate      *time.Time                       `json:"endDate,omitempty"`
	Status       domain.PrescriptionStatus        `json:"status"`
	CreatedAt    time.Time                        `json:"createdAt"`
	UpdatedAt    time.Time                        `json:"updatedAt"`
}
