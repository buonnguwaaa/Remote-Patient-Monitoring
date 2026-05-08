package ws

import (
	"context"
	"encoding/json"
	"log"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const chatEventChannel = "chat-events"

type redisChatBroadcastEnvelope struct {
	ConversationID primitive.ObjectID `json:"conversationId"`
	Message        json.RawMessage    `json:"message"`
}

type RedisChatEventSubscriber struct {
	client *redis.Client
	hub    *Hub
}

func NewRedisChatEventSubscriber(client *redis.Client, hub *Hub) *RedisChatEventSubscriber {
	if client == nil || hub == nil {
		return nil
	}

	return &RedisChatEventSubscriber{client: client, hub: hub}
}

func (s *RedisChatEventSubscriber) Start(ctx context.Context) error {
	if s == nil || s.client == nil || s.hub == nil {
		return nil
	}

	pubsub := s.client.Subscribe(ctx, chatEventChannel)
	defer pubsub.Close()

	log.Printf("[GIN-info] subscribed to Redis chat channel %q", chatEventChannel)

	channel := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-channel:
			if !ok {
				return nil
			}

			var envelope redisChatBroadcastEnvelope
			if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
				log.Printf("warn: failed to decode redis chat event: %v", err)
				continue
			}
			if envelope.ConversationID.IsZero() || len(envelope.Message) == 0 {
				log.Printf("warn: dropping malformed redis chat event")
				continue
			}

			s.hub.Broadcast <- BroadcastMessage{
				ConversationID: envelope.ConversationID,
				Message:        envelope.Message,
			}
		}
	}
}
