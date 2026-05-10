package measurement_helper

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

const defaultUserEventChannel = "user-events"

// RedisUserEventPublisher publishes user-level events to the "user-events" Redis channel.
// This is used by the Temporal worker to send realtime notifications to doctors.
type RedisUserEventPublisher struct {
	client  *redis.Client
	channel string
}

type userEventEnvelope struct {
	UserID string          `json:"userId"`
	Event  json.RawMessage `json:"event"`
}

// NewRedisUserEventPublisher creates a new user event publisher.
func NewRedisUserEventPublisher(client *redis.Client) *RedisUserEventPublisher {
	if client == nil {
		return nil
	}
	return &RedisUserEventPublisher{client: client, channel: defaultUserEventChannel}
}

// Publish publishes a user-level event to the Redis channel.
// event can be any JSON-serializable value.
func (p *RedisUserEventPublisher) Publish(ctx context.Context, userID string, event interface{}) error {
	if p == nil || p.client == nil {
		return nil
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal user event: %w", err)
	}

	envelope := userEventEnvelope{
		UserID: userID,
		Event:  eventJSON,
	}

	payload, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to marshal user event envelope: %w", err)
	}

	if err := p.client.Publish(ctx, p.channel, payload).Err(); err != nil {
		return fmt.Errorf("failed to publish user event: %w", err)
	}

	return nil
}
