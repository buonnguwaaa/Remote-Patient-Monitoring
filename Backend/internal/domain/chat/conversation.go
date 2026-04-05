package chat

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Conversation struct {
	ID             primitive.ObjectID   `bson:"_id,omitempty"`
	ParticipantIDs []primitive.ObjectID `bson:"participantIds"`
	ParticipantKey string               `bson:"participantKey,omitempty"`
	CreatedAt      time.Time            `bson:"createdAt"`
	UpdatedAt      time.Time            `bson:"updatedAt"`
}
