package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Backfills violations[].source on existing alerts.
// Safe to re-run: documents whose every violation already has source
// "threshold" or "trend" are skipped.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_alert_violation_source
//	go run ./migration/cmd/migrate_alert_violation_source --dry-run
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-alert-source] no .env file found, using environment variables")
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-alert-source] could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-alert-source] disconnect error: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	col := config.Mongo.Database.Collection("alerts")

	// Any alert that still has at least one violation without a valid source.
	filter := bson.M{
		"violations": bson.M{
			"$elemMatch": bson.M{
				"$or": []bson.M{
					{"source": bson.M{"$exists": false}},
					{"source": ""},
					{"source": bson.M{"$nin": bson.A{
						string(domain.ViolationSourceThreshold),
						string(domain.ViolationSourceTrend),
					}}},
				},
			},
		},
	}

	cursor, err := col.Find(ctx, filter, options.Find().SetProjection(bson.M{
		"_id":        1,
		"violations": 1,
	}))
	if err != nil {
		log.Fatalf("[migrate-alert-source] find: %v", err)
	}
	defer cursor.Close(ctx)

	mode := "migrated"
	if dryRun {
		mode = "dry-run would migrate"
	}

	var scanned, updated, skipped, violationPatched int
	for cursor.Next(ctx) {
		var doc struct {
			ID         primitive.ObjectID          `bson:"_id"`
			Violations []domain.ThresholdViolation `bson:"violations"`
		}
		if err := cursor.Decode(&doc); err != nil {
			log.Fatalf("[migrate-alert-source] decode: %v", err)
		}
		scanned++

		changed := false
		for i := range doc.Violations {
			before := doc.Violations[i].Source
			doc.Violations[i] = normalizeSource(doc.Violations[i])
			if doc.Violations[i].Source != before {
				changed = true
				violationPatched++
			}
		}

		if !changed {
			skipped++
			continue
		}

		if dryRun {
			log.Printf("[migrate-alert-source] dry-run would update alert %s (%d violations)",
				doc.ID.Hex(), len(doc.Violations))
			updated++
			continue
		}

		now := time.Now().UTC()
		_, err := col.UpdateOne(ctx, bson.M{"_id": doc.ID}, bson.M{
			"$set": bson.M{
				"violations": doc.Violations,
				"updatedAt":  now,
			},
		})
		if err != nil {
			log.Fatalf("[migrate-alert-source] update %s: %v", doc.ID.Hex(), err)
		}
		updated++
	}
	if err := cursor.Err(); err != nil {
		log.Fatalf("[migrate-alert-source] cursor: %v", err)
	}

	log.Printf("[migrate-alert-source] scanned=%d %s=%d skipped=%d violations_patched=%d",
		scanned, mode, updated, skipped, violationPatched)
}

func normalizeSource(v domain.ThresholdViolation) domain.ThresholdViolation {
	if v.Source == domain.ViolationSourceThreshold || v.Source == domain.ViolationSourceTrend {
		return v
	}
	if isTrendRule(v.Rule) {
		v.Source = domain.ViolationSourceTrend
	} else {
		v.Source = domain.ViolationSourceThreshold
	}
	return v
}

func isTrendRule(rule string) bool {
	switch rule {
	case "trend_rising_watch", "trend_rising_high", "trend_falling_watch", "trend_falling_high":
		return true
	default:
		return false
	}
}
