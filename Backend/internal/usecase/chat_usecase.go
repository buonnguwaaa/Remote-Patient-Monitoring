package usecase

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateConversationInput struct {
	ParticipantIDs []primitive.ObjectID
}

type GetUserConversationsInput struct {
	UserID primitive.ObjectID
	Cursor time.Time
	Limit  int
}

type SendMessageInput struct {
	ConversationID   primitive.ObjectID
	SenderID         primitive.ObjectID
	Content          string
	ReplyToMessageID *primitive.ObjectID
	RelatedAlertID   *primitive.ObjectID
}

type GetConversationMessagesInput struct {
	ConversationID primitive.ObjectID
	RequesterID    primitive.ObjectID
	Cursor         primitive.ObjectID
	Limit          int
}

type ValidateParticipantInput struct {
	ConversationID primitive.ObjectID
	UserID         primitive.ObjectID
}
