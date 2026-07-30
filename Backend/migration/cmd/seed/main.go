package main

import (
	"context"
	"log"
	"os"
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

	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Hour)
	defer cancel()

	mode := "full"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	switch mode {
	case "append":
		// Adds 10 patients (diseaseTypes matched to the doctor's specialty,
		// nurse from the same department, full past-dated record bundle) to
		// every active doctor, without dropping existing data. Requires a
		// prior full seed.
		if err := seed.RunAppend(ctx, config.Mongo.Database); err != nil {
			log.Fatalf("[seed-append] failed: %v", err)
		}
	case "history":
		// Adds consecutive past measurements + threshold/trend alerts for
		// every existing patient. Does not drop data or seed chat.
		if err := seed.RunEnrichMeasurementHistory(ctx, config.Mongo.Database); err != nil {
			log.Fatalf("[seed-history] failed: %v", err)
		}
	case "full", "":
		if err := seed.Run(ctx, config.Mongo.Database); err != nil {
			log.Fatalf("[seed] failed: %v", err)
		}
	default:
		log.Fatalf("[seed] unknown mode %q (use \"full\", \"append\", or \"history\")", mode)
	}
}
