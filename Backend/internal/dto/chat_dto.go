package dto

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateConversationRequest struct {
	ParticipantIDs []primitive.ObjectID `json:"participantIds" binding:"required,min=1"`
}

type SendMessageRequest struct {
	Content        string              `json:"content" binding:"required"`
	RelatedAlertID *primitive.ObjectID `json:"relatedAlertId,omitempty"`
}

type ConversationResponse struct {
	ID             primitive.ObjectID   `json:"id"`
	ParticipantIDs []primitive.ObjectID `json:"participantIds"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
}

type MessageResponse struct {
	ID             primitive.ObjectID  `json:"id"`
	ConversationID primitive.ObjectID  `json:"conversationId"`
	SenderID       primitive.ObjectID  `json:"senderId"`
	Content        string              `json:"content"`
	RelatedAlertID *primitive.ObjectID `json:"relatedAlertId,omitempty"`
	CreatedAt      time.Time           `json:"createdAt"`
	UpdatedAt      time.Time           `json:"updatedAt"`
}

type GetConversationsResponse struct {
	Conversations []ConversationResponse `json:"conversations"`
	Paging        Paging                 `json:"paging"`
}

type GetMessagesResponse struct {
	Messages []MessageResponse `json:"messages"`
	Paging   Paging            `json:"paging"`
}

type Paging struct {
	HasMore    bool   `json:"hasMore"`
	NextCursor string `json:"nextCursor,omitempty"`
}
