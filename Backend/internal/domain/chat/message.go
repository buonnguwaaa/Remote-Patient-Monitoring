package chat

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty"`
	ConversationID primitive.ObjectID  `bson:"conversation_id"`
	SenderID       primitive.ObjectID  `bson:"sender_id"`
	Content        string              `bson:"content"`
	RelatedAlertID *primitive.ObjectID `bson:"related_alert_id,omitempty"`
	CreatedAt      time.Time           `bson:"created_at"`
}
