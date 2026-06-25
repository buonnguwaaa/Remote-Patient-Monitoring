package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VideoSessionStatus represents the lifecycle of a video call session.
type VideoSessionStatus string

const (
	VideoSessionPending  VideoSessionStatus = "pending"
	VideoSessionActive   VideoSessionStatus = "active"
	VideoSessionEnded    VideoSessionStatus = "ended"
	VideoSessionRejected VideoSessionStatus = "rejected"
	VideoSessionMissed   VideoSessionStatus = "missed"
	VideoSessionExpired  VideoSessionStatus = "expired"
)

// VideoSession stores a single video call session between a doctor and a patient.
// DoctorID and PatientID are the MongoDB _id of the user document (same as userId used in JWT).
// RoomName is generated randomly and does not contain any PII.
type VideoSession struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"`
	ConversationID primitive.ObjectID `bson:"conversationId"`
	DoctorID       primitive.ObjectID `bson:"doctorId"`
	PatientID      primitive.ObjectID `bson:"patientId"`
	CreatedBy      primitive.ObjectID `bson:"createdBy"`

	// Provider is always "jitsi" for MVP.
	Provider string `bson:"provider"`
	// RoomName is a random, PII-free identifier: rpm_{convIdShort}_{randomToken}
	RoomName string `bson:"roomName"`
	// JoinURL is not stored persistently; it is constructed on-demand from env config.
	// We store RoomName only and rebuild the URL server-side.

	Status    VideoSessionStatus `bson:"status"`
	StartedAt *time.Time         `bson:"startedAt,omitempty"`
	EndedAt   *time.Time         `bson:"endedAt,omitempty"`
	ExpiresAt time.Time          `bson:"expiresAt"`

	CreatedAt time.Time `bson:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt"`
}
