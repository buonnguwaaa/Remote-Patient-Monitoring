package dto

import (
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CreateConversationRequest struct {
	ParticipantIDs []primitive.ObjectID `json:"participantIds" binding:"required,min=1"`
}

type SendMessageRequest struct {
	Content          string              `json:"content" binding:"required"`
	ReplyToMessageID *primitive.ObjectID `json:"replyToMessageId,omitempty"`
	RelatedAlertID   *primitive.ObjectID `json:"relatedAlertId,omitempty"`
}

type ConversationParticipantResponse struct {
	UserID                 primitive.ObjectID  `json:"userId"`
	LastReadMessageID      *primitive.ObjectID `json:"lastReadMessageId,omitempty"`
	LastDeliveredMessageID *primitive.ObjectID `json:"lastDeliveredMessageId,omitempty"`
}

type ConversationResponse struct {
	ID              primitive.ObjectID                `json:"id"`
	Participants    []ConversationParticipantResponse `json:"participants"`
	LatestMessageID *primitive.ObjectID               `json:"latestMessageId,omitempty"`
	LastMessage     *MessageResponse                  `json:"lastMessage,omitempty"`
	CreatedAt       time.Time                         `json:"createdAt"`
	UpdatedAt       time.Time                         `json:"updatedAt"`
}

type MessageResponse struct {
	ID               primitive.ObjectID   `json:"id"`
	ConversationID   primitive.ObjectID   `json:"conversationId"`
	MessageSource    domain.MessageSource `json:"messageSource"`
	SenderID         *primitive.ObjectID  `json:"senderId"`
	Content          string               `json:"content"`
	ReplyToMessageID *primitive.ObjectID  `json:"replyToMessageId,omitempty"`
	RelatedAlertID   *primitive.ObjectID  `json:"relatedAlertId,omitempty"`
	CreatedAt        time.Time            `json:"createdAt"`
	UpdatedAt        time.Time            `json:"updatedAt"`
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
