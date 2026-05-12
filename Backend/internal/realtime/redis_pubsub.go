package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

const userEventChannel = "user-events"

// RedisUserEventEnvelope is the envelope published to the "user-events" Redis channel.
type RedisUserEventEnvelope struct {
	UserID string          `json:"userId"`
	Event  json.RawMessage `json:"event"`
}

// RedisUserEventSubscriber subscribes to "user-events" channel and
// dispatches events to the correct user via the RealtimeHub.
type RedisUserEventSubscriber struct {
	client *redis.Client
	hub    *Hub
}

// NewRedisUserEventSubscriber creates a subscriber that reads user-level events
// from Redis and pushes them to the RealtimeHub.
func NewRedisUserEventSubscriber(client *redis.Client, hub *Hub) *RedisUserEventSubscriber {
	if client == nil || hub == nil {
		return nil
	}
	return &RedisUserEventSubscriber{client: client, hub: hub}
}

// Start begins listening on the Redis channel. Blocks until ctx is cancelled.
func (s *RedisUserEventSubscriber) Start(ctx context.Context) error {
	if s == nil || s.client == nil || s.hub == nil {
		return nil
	}

	pubsub := s.client.Subscribe(ctx, userEventChannel)
	defer pubsub.Close()

	log.Printf("[GIN-info] subscribed to Redis user-events channel %q", userEventChannel)

	channel := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-channel:
			if !ok {
				return nil
			}

			var envelope RedisUserEventEnvelope
			if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
				log.Printf("warn: failed to decode redis user event: %v", err)
				continue
			}
			if envelope.UserID == "" || len(envelope.Event) == 0 {
				log.Printf("warn: dropping malformed redis user event")
				continue
			}

			s.hub.SendToUser(envelope.UserID, envelope.Event)
		}
	}
}

// RedisUserEventPublisher publishes user-level events to the "user-events" Redis channel.
type RedisUserEventPublisher struct {
	client *redis.Client
}

// NewRedisUserEventPublisher creates a new publisher.
func NewRedisUserEventPublisher(client *redis.Client) *RedisUserEventPublisher {
	if client == nil {
		return nil
	}
	return &RedisUserEventPublisher{client: client}
}

// Publish sends a realtime event targeting a specific user to the Redis channel.
func (p *RedisUserEventPublisher) Publish(ctx context.Context, userID string, event RealtimeEvent) error {
	if p == nil || p.client == nil {
		return nil
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal realtime event: %w", err)
	}

	envelope := RedisUserEventEnvelope{
		UserID: userID,
		Event:  eventJSON,
	}

	payload, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to marshal user event envelope: %w", err)
	}

	if err := p.client.Publish(ctx, userEventChannel, payload).Err(); err != nil {
		return fmt.Errorf("failed to publish user event: %w", err)
	}

	return nil
}
