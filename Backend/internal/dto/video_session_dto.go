package dto

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CreateVideoSessionRequest is the request body for POST /video-sessions.
// ConversationID is optional; if omitted, the service will find or create a conversation.
type CreateVideoSessionRequest struct {
	PatientID      primitive.ObjectID  `json:"patientId" binding:"required"`
	ConversationID *primitive.ObjectID `json:"conversationId,omitempty"`
}

// VideoSessionResponse is returned for all video session endpoints.
// JoinURL is only included in responses to authorized join requests (POST /video-sessions/:id/join).
// Other endpoints return JoinURL as empty string to avoid leaking it.
type VideoSessionResponse struct {
	ID             primitive.ObjectID `json:"id"`
	ConversationID primitive.ObjectID `json:"conversationId"`
	DoctorID       primitive.ObjectID `json:"doctorId"`
	PatientID      primitive.ObjectID `json:"patientId"`
	Provider       string             `json:"provider"`
	RoomName       string             `json:"roomName"`
	// JoinURL is only populated for authorized join responses.
	JoinURL   string     `json:"joinUrl,omitempty"`
	Status    string     `json:"status"`
	StartedAt *time.Time `json:"startedAt,omitempty"`
	EndedAt   *time.Time `json:"endedAt,omitempty"`
	ExpiresAt time.Time  `json:"expiresAt"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}
