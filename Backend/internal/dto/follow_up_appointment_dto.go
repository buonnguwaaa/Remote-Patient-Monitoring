package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateFollowUpAppointmentRequest struct {
	PatientID       string    `json:"patientId" binding:"required"`
	DoctorID        string    `json:"doctorId"`
	ScheduledAt     time.Time `json:"scheduledAt" binding:"required"`
	DurationMinutes int       `json:"durationMinutes"`
	Timezone        string    `json:"timezone" binding:"required"`
	Location        string    `json:"location"`
	Notes           string    `json:"notes"`
}

type UpdateFollowUpAppointmentRequest struct {
	ScheduledAt     *time.Time `json:"scheduledAt"`
	DurationMinutes *int       `json:"durationMinutes"`
	Timezone        *string    `json:"timezone"`
	Location        *string    `json:"location"`
	Notes           *string    `json:"notes"`
}

type UpdateFollowUpAppointmentStatusRequest struct {
	Status domain.FollowUpAppointmentStatus `json:"status" binding:"required,oneof=scheduled completed canceled"`
}

type FollowUpAppointmentResponse struct {
	ID              string                           `json:"id"`
	PatientID       string                           `json:"patientId"`
	DoctorID        string                           `json:"doctorId"`
	ScheduledAt     time.Time                        `json:"scheduledAt"`
	DurationMinutes int                              `json:"durationMinutes"`
	Timezone        string                           `json:"timezone"`
	Location        string                           `json:"location,omitempty"`
	Notes           string                           `json:"notes,omitempty"`
	Status          domain.FollowUpAppointmentStatus `json:"status"`
	CreatedBy       string                           `json:"createdBy"`
	CreatedAt       time.Time                        `json:"createdAt"`
	UpdatedAt       time.Time                        `json:"updatedAt"`
}
