package dto

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
)

type MeasurementAlertInput struct {
	MeasurementID string
	PatientID     string
}

type EvaluateAndCreateAlertResult struct {
	Created bool   `json:"created"`
	AlertID string `json:"alertId,omitempty"`
}

type SendAlertMessageInput struct {
	AlertID string `json:"alertId"`
}

type SendAlertMessageResult struct {
	ConversationID string               `json:"conversationId"`
	Message        *dto.MessageResponse `json:"message"`
	DoctorID       string               `json:"doctorId"`
	PatientID      string               `json:"patientId"`
	AlertID        string               `json:"alertId"`
	Severity       string               `json:"severity"`
}

type PublishChatEventInput struct {
	ConversationID string               `json:"conversationId"`
	Message        *dto.MessageResponse `json:"message"`
}

type PublishUserEventInput struct {
	ConversationID string               `json:"conversationId"`
	Message        *dto.MessageResponse `json:"message"`
	DoctorID       string               `json:"doctorId"`
	PatientID      string               `json:"patientId"`
	AlertID        string               `json:"alertId"`
	Severity       string               `json:"severity"`
}
