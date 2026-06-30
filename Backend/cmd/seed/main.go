package main

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("[seed] no .env file found, using environment variables")
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[seed] could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[seed] error disconnecting from MongoDB: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := seed.Run(ctx, config.Mongo.Database); err != nil {
		log.Fatalf("[seed] failed: %v", err)
	}
}
