package measurement_helper

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const defaultChatEventChannel = "chat-events"

type ChatEventPublisher interface {
	PublishChatEvent(ctx context.Context, conversationID primitive.ObjectID, message []byte) error
}

type redisChatEventPublisher struct {
	client  *redis.Client
	channel string
}

type chatBroadcastEnvelope struct {
	ConversationID primitive.ObjectID `json:"conversationId"`
	Message        json.RawMessage    `json:"message"`
}

func NewRedisChatEventPublisher(client *redis.Client) ChatEventPublisher {
	if client == nil {
		return nil
	}

	return &redisChatEventPublisher{client: client, channel: defaultChatEventChannel}
}

func (p *redisChatEventPublisher) PublishChatEvent(ctx context.Context, conversationID primitive.ObjectID, message []byte) error {
	if p == nil || p.client == nil {
		return nil
	}

	payload, err := json.Marshal(chatBroadcastEnvelope{
		ConversationID: conversationID,
		Message:        message,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal chat broadcast envelope: %w", err)
	}

	if err := p.client.Publish(ctx, p.channel, payload).Err(); err != nil {
		return fmt.Errorf("failed to publish chat event: %w", err)
	}

	return nil
}
