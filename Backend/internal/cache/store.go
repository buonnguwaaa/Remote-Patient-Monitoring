// Package cache provides a small Redis-backed cache-aside helper used by
// repository decorators. It reuses the same *redis.Client instance the app
// already uses for pub/sub (config.Redis.Client) so no extra infrastructure
// is required.
package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"time"

	"github.com/redis/go-redis/v9"
)

// jitterFraction is the maximum +/- fraction of TTL randomization applied by
// Set. Keys populated in a burst (e.g. a wave of patients queried right
// after a cache flush) would otherwise all expire at almost the exact same
// instant, causing a "thundering herd" of simultaneous cache misses that all
// hit MongoDB at once. Spreading expirations out smooths that spike into a
// steady trickle of misses instead. 10% is a common, conservative default
// (see e.g. AWS/Redis caching best practices).
const jitterFraction = 0.10

// ErrMiss is returned by Store.Get when the key does not exist in Redis.
// Callers treat it as a normal cache miss and fall back to the source of
// truth (e.g. MongoDB).
var ErrMiss = errors.New("cache: miss")

// Store is a thin JSON wrapper around a Redis client. A nil *Store, or a
// Store built with a nil client, behaves as a permanently-empty cache: every
// Get is a miss and every Set/Delete is a no-op. This lets callers wire a
// Store unconditionally and disable caching (e.g. via config) without
// branching in every repository.
type Store struct {
	client *redis.Client
	prefix string
}

// NewStore builds a Store on top of client, namespacing every key with
// prefix (e.g. "cache") to avoid collisions with other Redis usages such as
// pub/sub channels.
func NewStore(client *redis.Client, prefix string) *Store {
	return &Store{client: client, prefix: prefix}
}

// Enabled reports whether the store can actually talk to Redis.
func (s *Store) Enabled() bool {
	return s != nil && s.client != nil
}

func (s *Store) namespacedKey(key string) string {
	if s.prefix == "" {
		return key
	}
	return s.prefix + ":" + key
}

// Get looks up key and unmarshals its JSON value into dest. It returns
// ErrMiss when the key is absent (or the store is disabled), and a wrapped
// error for any other Redis/decoding failure.
func (s *Store) Get(ctx context.Context, key string, dest any) error {
	if !s.Enabled() {
		return ErrMiss
	}

	raw, err := s.client.Get(ctx, s.namespacedKey(key)).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return ErrMiss
		}
		return fmt.Errorf("cache: get %q: %w", key, err)
	}

	if err := json.Unmarshal(raw, dest); err != nil {
		return fmt.Errorf("cache: unmarshal %q: %w", key, err)
	}

	log.Printf("[INFO] cache hit: %s", key)
	return nil
}

// Set stores value as JSON under key, expiring after ttl +/- a small random
// jitter (see jitterFraction). A zero or negative ttl means the key never
// expires; callers should generally always set a TTL to avoid stale data
// lingering forever.
func (s *Store) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	if !s.Enabled() {
		return nil
	}

	raw, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("cache: marshal %q: %w", key, err)
	}

	if err := s.client.Set(ctx, s.namespacedKey(key), raw, jitteredTTL(ttl)).Err(); err != nil {
		return fmt.Errorf("cache: set %q: %w", key, err)
	}
	return nil
}

// jitteredTTL randomizes ttl by up to +/- jitterFraction so that entries
// written around the same time don't all expire in lockstep.
func jitteredTTL(ttl time.Duration) time.Duration {
	if ttl <= 0 {
		return ttl
	}

	// rand.Float64() is in [0, 1); shift/scale to [-jitterFraction, +jitterFraction].
	delta := (rand.Float64()*2 - 1) * jitterFraction
	jittered := time.Duration(float64(ttl) * (1 + delta))
	if jittered <= 0 {
		return ttl
	}
	return jittered
}

// Delete removes one or more keys from the cache. Used by repository
// decorators to invalidate entries on writes.
func (s *Store) Delete(ctx context.Context, keys ...string) error {
	if !s.Enabled() || len(keys) == 0 {
		return nil
	}

	namespaced := make([]string, len(keys))
	for i, k := range keys {
		namespaced[i] = s.namespacedKey(k)
	}

	if err := s.client.Del(ctx, namespaced...).Err(); err != nil {
		return fmt.Errorf("cache: delete %v: %w", keys, err)
	}
	return nil
}

// DeleteByPrefix removes every key whose namespaced form starts with prefix.
func (s *Store) DeleteByPrefix(ctx context.Context, prefix string) error {
	if !s.Enabled() || prefix == "" {
		return nil
	}

	match := s.namespacedKey(prefix) + "*"
	var cursor uint64

	for {
		keys, nextCursor, err := s.client.Scan(ctx, cursor, match, 100).Result()
		if err != nil {
			return fmt.Errorf("cache: scan prefix %q: %w", prefix, err)
		}

		if len(keys) > 0 {
			if err := s.client.Del(ctx, keys...).Err(); err != nil {
				return fmt.Errorf("cache: delete prefix %q: %w", prefix, err)
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return nil
}

// GetOrSet implements the classic cache-aside read: try the cache first, and
// on a miss (or any cache error) call load, store its result, then return
// it. Cache infrastructure failures never fail the request - they just
// degrade to always calling load, same as if the store were disabled.
func GetOrSet[T any](ctx context.Context, s *Store, key string, ttl time.Duration, load func(ctx context.Context) (T, error)) (T, error) {
	var value T
	if err := s.Get(ctx, key, &value); err == nil {
		return value, nil
	}

	value, err := load(ctx)
	if err != nil {
		return value, err
	}

	_ = s.Set(ctx, key, value, ttl)
	return value, nil
}
