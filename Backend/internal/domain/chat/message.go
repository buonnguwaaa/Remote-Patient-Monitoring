package chat

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MessageSource string

const (
	UserMessage   MessageSource = "user"
	SystemMessage MessageSource = "system"
)

type Message struct {
	ID               primitive.ObjectID  `bson:"_id,omitempty"`
	ConversationID   primitive.ObjectID  `bson:"conversationId"`
	MessageSource    MessageSource       `bson:"messageSource"`
	SenderID         *primitive.ObjectID `bson:"senderId,omitempty"`
	Content          string              `bson:"content"`
	ReplyToMessageID *primitive.ObjectID `bson:"replyToMessageId,omitempty"`
	RelatedAlertID   *primitive.ObjectID `bson:"relatedAlertId,omitempty"`
	CreatedAt        time.Time           `bson:"createdAt"`
}
