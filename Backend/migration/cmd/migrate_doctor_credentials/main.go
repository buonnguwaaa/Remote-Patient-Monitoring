package main

import (
	"context"
	"log"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var drPrefixPattern = regexp.MustCompile(`(?i)^Dr\.?\s+`)

// Backfills academicDegree, professionalQualification, academicTitle for
// existing doctors and strips legacy "Dr." prefixes from name.
// Safe to re-run: doctors that already have all three credential fields set
// and a clean name are skipped.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_doctor_credentials
//	go run ./migration/cmd/migrate_doctor_credentials --dry-run
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-doctor-credentials] no .env file found, using environment variables")
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-doctor-credentials] could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-doctor-credentials] disconnect error: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	col := config.Mongo.Database.Collection("users")

	filter := bson.M{"role": string(userDomain.RoleDoctor)}

	cursor, err := col.Find(ctx, filter, options.Find().
		SetSort(bson.D{{Key: "email", Value: 1}}).
		SetProjection(bson.M{
			"_id":                       1,
			"name":                      1,
			"email":                     1,
			"academicDegree":            1,
			"professionalQualification": 1,
			"academicTitle":             1,
		}))
	if err != nil {
		log.Fatalf("[migrate-doctor-credentials] find: %v", err)
	}
	defer cursor.Close(ctx)

	mode := "updated"
	if dryRun {
		mode = "dry-run would update"
	}

	var scanned, updated, skipped int
	index := 0
	for cursor.Next(ctx) {
		var doc struct {
			ID                        primitive.ObjectID                    `bson:"_id"`
			Name                      string                                `bson:"name"`
			Email                     string                                `bson:"email"`
			AcademicDegree            userDomain.AcademicDegree             `bson:"academicDegree"`
			ProfessionalQualification userDomain.ProfessionalQualification  `bson:"professionalQualification"`
			AcademicTitle             userDomain.AcademicTitle              `bson:"academicTitle"`
		}
		if err := cursor.Decode(&doc); err != nil {
			log.Fatalf("[migrate-doctor-credentials] decode: %v", err)
		}
		scanned++

		setFields := bson.M{}
		degree := doc.AcademicDegree
		if degree == "" {
			degree = seed.DoctorAcademicDegree(index)
			setFields["academicDegree"] = degree
		}

		if doc.ProfessionalQualification == "" {
			setFields["professionalQualification"] = seed.DoctorProfessionalQualification(index)
		}

		title := doc.AcademicTitle
		if title == "" {
			title = seed.DoctorAcademicTitle(index, degree)
		}
		if err := userDomain.ValidateCredentials(degree, title); err != nil {
			if title != "" {
				setFields["academicTitle"] = ""
			}
		} else if doc.AcademicTitle == "" && title != "" {
			setFields["academicTitle"] = title
		}

		if cleaned := stripDrPrefix(doc.Name); cleaned != doc.Name {
			setFields["name"] = cleaned
		}

		if len(setFields) == 0 {
			skipped++
			index++
			continue
		}

		setFields["updatedAt"] = time.Now().UTC()

		if dryRun {
			log.Printf("[migrate-doctor-credentials] dry-run %s (%s): %+v", doc.ID.Hex(), doc.Email, setFields)
			updated++
			index++
			continue
		}

		if _, err := col.UpdateByID(ctx, doc.ID, bson.M{"$set": setFields}); err != nil {
			log.Fatalf("[migrate-doctor-credentials] update %s: %v", doc.ID.Hex(), err)
		}
		log.Printf("[migrate-doctor-credentials] updated %s (%s)", doc.ID.Hex(), doc.Email)
		updated++
		index++
	}
	if err := cursor.Err(); err != nil {
		log.Fatalf("[migrate-doctor-credentials] cursor: %v", err)
	}

	log.Printf("[migrate-doctor-credentials] scanned=%d %s=%d skipped=%d", scanned, mode, updated, skipped)
}

func stripDrPrefix(name string) string {
	return strings.TrimSpace(drPrefixPattern.ReplaceAllString(strings.TrimSpace(name), ""))
}
