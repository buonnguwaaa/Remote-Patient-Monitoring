package repository

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	accessJTIBlacklistPrefix = "auth:blacklist:jti:"
	userInvalidBeforePrefix  = "auth:invalid_before:"
)

// TokenBlacklistRepository stores revoked access-token identifiers until they expire.
// Redis is preferred over MongoDB because lookups are O(1) on every authenticated
// request and keys auto-expire with TTL matching the access-token lifetime.
type TokenBlacklistRepository interface {
	// BlacklistJTI marks a specific access token as revoked until expiresAt.
	BlacklistJTI(ctx context.Context, jti string, expiresAt time.Time) error
	// IsJTIBlacklisted reports whether jti was revoked.
	IsJTIBlacklisted(ctx context.Context, jti string) (bool, error)
	// InvalidateUserTokensIssuedBefore rejects access tokens for userID whose
	// IssuedAt is strictly before issuedBefore (e.g. re-login, password reset).
	InvalidateUserTokensIssuedBefore(ctx context.Context, userID string, issuedBefore time.Time, ttl time.Duration) error
	// GetUserInvalidBefore returns the cutoff time if one is set.
	GetUserInvalidBefore(ctx context.Context, userID string) (time.Time, bool, error)
}

type redisTokenBlacklistRepository struct {
	client *redis.Client
}

func NewTokenBlacklistRepository(client *redis.Client) TokenBlacklistRepository {
	return &redisTokenBlacklistRepository{client: client}
}

func (r *redisTokenBlacklistRepository) BlacklistJTI(ctx context.Context, jti string, expiresAt time.Time) error {
	if r.client == nil {
		return fmt.Errorf("token blacklist: redis client is nil")
	}
	if jti == "" {
		return fmt.Errorf("token blacklist: empty jti")
	}

	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		return nil
	}

	key := accessJTIBlacklistPrefix + jti
	if err := r.client.Set(ctx, key, "1", ttl).Err(); err != nil {
		return fmt.Errorf("token blacklist: blacklist jti: %w", err)
	}
	return nil
}

func (r *redisTokenBlacklistRepository) IsJTIBlacklisted(ctx context.Context, jti string) (bool, error) {
	if r.client == nil {
		return false, fmt.Errorf("token blacklist: redis client is nil")
	}
	if jti == "" {
		return false, nil
	}

	n, err := r.client.Exists(ctx, accessJTIBlacklistPrefix+jti).Result()
	if err != nil {
		return false, fmt.Errorf("token blacklist: check jti: %w", err)
	}
	return n > 0, nil
}

func (r *redisTokenBlacklistRepository) InvalidateUserTokensIssuedBefore(ctx context.Context, userID string, issuedBefore time.Time, ttl time.Duration) error {
	if r.client == nil {
		return fmt.Errorf("token blacklist: redis client is nil")
	}
	if userID == "" {
		return fmt.Errorf("token blacklist: empty userID")
	}
	if ttl <= 0 {
		ttl = time.Minute
	}

	key := userInvalidBeforePrefix + userID
	value := strconv.FormatInt(issuedBefore.UTC().Unix(), 10)
	if err := r.client.Set(ctx, key, value, ttl).Err(); err != nil {
		return fmt.Errorf("token blacklist: invalidate user tokens: %w", err)
	}
	return nil
}

func (r *redisTokenBlacklistRepository) GetUserInvalidBefore(ctx context.Context, userID string) (time.Time, bool, error) {
	if r.client == nil {
		return time.Time{}, false, fmt.Errorf("token blacklist: redis client is nil")
	}
	if userID == "" {
		return time.Time{}, false, nil
	}

	raw, err := r.client.Get(ctx, userInvalidBeforePrefix+userID).Result()
	if err == redis.Nil {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, fmt.Errorf("token blacklist: get user invalid-before: %w", err)
	}

	unixSec, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return time.Time{}, false, fmt.Errorf("token blacklist: parse invalid-before: %w", err)
	}
	return time.Unix(unixSec, 0).UTC(), true, nil
}
