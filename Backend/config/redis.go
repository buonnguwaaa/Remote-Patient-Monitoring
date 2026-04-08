package config

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisInstance struct {
	Client *redis.Client
}

var Redis RedisInstance

func ConnectRedis() error {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	password := os.Getenv("REDIS_PASSWORD")

	db := 0
	if rawDB := os.Getenv("REDIS_DB"); rawDB != "" {
		parsedDB, err := strconv.Atoi(rawDB)
		if err != nil {
			return fmt.Errorf("invalid REDIS_DB value: %w", err)
		}
		db = parsedDB
	}

	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 5 * time.Second,
	})

	if err := client.Ping(context.Background()).Err(); err != nil {
		return fmt.Errorf("failed to ping Redis: %w", err)
	}

	Redis = RedisInstance{Client: client}
	return nil
}

func DisconnectRedis() error {
	if Redis.Client == nil {
		return nil
	}

	return Redis.Client.Close()
}
