package chat

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Participant struct {
	UserID                 primitive.ObjectID  `bson:"userId"`
	LastReadMessageID      *primitive.ObjectID `bson:"lastReadMessageId,omitempty"`
	LastDeliveredMessageID *primitive.ObjectID `bson:"lastDeliveredMessageId,omitempty"`
}

type Conversation struct {
	ID           primitive.ObjectID `bson:"_id,omitempty"`
	Participants []Participant      `bson:"participants"`
	CreatedAt    time.Time          `bson:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt"`
}
