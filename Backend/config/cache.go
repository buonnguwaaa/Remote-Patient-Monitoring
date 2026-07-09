package config

import (
	"os"
	"strconv"
	"time"
)

// defaultCacheTTL is used when CACHE_DEFAULT_TTL_SECONDS is unset or invalid.
const defaultCacheTTL = 5 * time.Minute

// CacheEnabled reports whether cache-aside reads/writes should be active.
// Defaults to true. Set CACHE_ENABLED=false to bypass the Redis cache-aside
// layer entirely (e.g. while debugging) without affecting Redis pub/sub.
func CacheEnabled() bool {
	raw := os.Getenv("CACHE_ENABLED")
	if raw == "" {
		return true
	}

	enabled, err := strconv.ParseBool(raw)
	if err != nil {
		return true
	}
	return enabled
}

// CacheDefaultTTL returns the default cache-aside entry TTL, configurable
// via the CACHE_DEFAULT_TTL_SECONDS environment variable.
func CacheDefaultTTL() time.Duration {
	raw := os.Getenv("CACHE_DEFAULT_TTL_SECONDS")
	if raw == "" {
		return defaultCacheTTL
	}

	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return defaultCacheTTL
	}
	return time.Duration(seconds) * time.Second
}
