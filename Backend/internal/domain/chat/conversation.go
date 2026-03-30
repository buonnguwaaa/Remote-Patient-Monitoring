package chat

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Conversation struct {
	ID             primitive.ObjectID   `bson:"_id,omitempty"`
	ParticipantIDs []primitive.ObjectID `bson:"participant_ids"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}
