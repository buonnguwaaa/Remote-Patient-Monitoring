package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type CreateReminderRequest struct {
	PatientID  string      `json:"patientId" binding:"required"`
	Kind       domain.Kind `json:"kind" binding:"required"`
	Message    string      `json:"message" binding:"required"`
	Hour       int         `json:"hour" binding:"min=0,max=23"`
	Minute     int         `json:"minute" binding:"min=0,max=59"`
	DaysOfWeek []int       `json:"daysOfWeek" binding:"required"`
	Timezone   string      `json:"timezone" binding:"required"`
	StartDate  time.Time   `json:"startDate" binding:"required"`
	EndDate    time.Time   `json:"endDate" binding:"required"`
}

type UpdateReminderRequest struct {
	Message    string                `json:"message" binding:"required"`
	Hour       int                   `json:"hour" binding:"min=0,max=23"`
	Minute     int                   `json:"minute" binding:"min=0,max=59"`
	DaysOfWeek []int                 `json:"daysOfWeek" binding:"required"`
	Timezone   string                `json:"timezone" binding:"required"`
	Status     domain.ReminderStatus `json:"status" binding:"required"`
	StartDate  time.Time             `json:"startDate" binding:"required"`
	EndDate    time.Time             `json:"endDate" binding:"required"`
}

type UpdateReminderStatusRequest struct {
	Status domain.ReminderStatus `json:"status" binding:"required"`
}

type ReminderResponse struct {
	ID         string                `json:"id"`
	PatientID  string                `json:"patientId"`
	Kind       domain.Kind           `json:"kind"`
	Message    string                `json:"message"`
	Hour       int                   `json:"hour"`
	Minute     int                   `json:"minute"`
	DaysOfWeek []int                 `json:"daysOfWeek"`
	Timezone   string                `json:"timezone"`
	Status     domain.ReminderStatus `json:"status"`
	StartDate  time.Time             `json:"startDate"`
	EndDate    time.Time             `json:"endDate"`
	CreatedBy  string                `json:"createdBy"`
	CreatedAt  time.Time             `json:"createdAt"`
	UpdatedAt  time.Time             `json:"updatedAt"`
}
