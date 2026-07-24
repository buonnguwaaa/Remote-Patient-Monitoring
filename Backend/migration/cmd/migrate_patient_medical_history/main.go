package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Rewrites sparse/short patient medicalHistory into concise clinical prose
// aligned with diseaseTypes (THA / ĐTĐ / both). Updates in place — does not
// delete patients or change disease flags.
//
// Safe to re-run: patients whose decrypted history already looks detailed
// (>~80 runes and not an old short label) are skipped unless --force.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_patient_medical_history --dry-run
//	go run ./migration/cmd/migrate_patient_medical_history
//	go run ./migration/cmd/migrate_patient_medical_history --force
//	go run ./migration/cmd/migrate_patient_medical_history --env=.env.production --dry-run
func main() {
	dryRun := false
	force := false
	envFile := ".env"
	for _, arg := range os.Args[1:] {
		switch {
		case arg == "--dry-run":
			dryRun = true
		case arg == "--force":
			force = true
		case strings.HasPrefix(arg, "--env="):
			envFile = strings.TrimPrefix(arg, "--env=")
		}
	}

	if err := godotenv.Load(envFile); err != nil {
		log.Printf("[migrate-patient-medical-history] no %s found, using environment variables", envFile)
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-patient-medical-history] connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-patient-medical-history] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if err := run(ctx, dryRun, force); err != nil {
		log.Fatalf("[migrate-patient-medical-history] failed: %v", err)
	}
}

type patientDoc struct {
	ID             primitive.ObjectID `bson:"_id"`
	Name           string             `bson:"name"`
	Email          string             `bson:"email"`
	MedicalHistory string             `bson:"medicalHistory"`
	DiseaseTypes   struct {
		BloodPressure bool `bson:"bloodPressure"`
		Glucose       bool `bson:"glucose"`
	} `bson:"diseaseTypes"`
}

func run(ctx context.Context, dryRun, force bool) error {
	mode := "APPLY"
	if dryRun {
		mode = "DRY-RUN"
	}
	log.Printf("[migrate-patient-medical-history] mode=%s force=%v db=%s",
		mode, force, config.Mongo.Database.Name())

	crypto, err := util.LoadFieldEncryptorFromEnv()
	if err != nil {
		log.Printf("[migrate-patient-medical-history] WARN field encryption unavailable: %v (writing plaintext)", err)
		crypto = util.NewNoopFieldEncryptor()
	}

	col := config.Mongo.Database.Collection("users")
	cursor, err := col.Find(ctx, bson.M{"role": string(userDomain.RolePatient)}, options.Find().
		SetSort(bson.D{{Key: "email", Value: 1}}).
		SetProjection(bson.M{
			"_id": 1, "name": 1, "email": 1, "medicalHistory": 1, "diseaseTypes": 1,
		}))
	if err != nil {
		return fmt.Errorf("find patients: %w", err)
	}
	defer cursor.Close(ctx)

	var scanned, updated, skipped int
	now := time.Now().UTC()

	for cursor.Next(ctx) {
		var p patientDoc
		if err := cursor.Decode(&p); err != nil {
			return fmt.Errorf("decode: %w", err)
		}
		scanned++

		currentPlain, err := crypto.Decrypt(p.MedicalHistory)
		if err != nil {
			return fmt.Errorf("decrypt medicalHistory %s: %w", p.Email, err)
		}
		if currentPlain == "" {
			currentPlain = p.MedicalHistory
		}

		if !force && !seed.IsSparseMedicalHistory(currentPlain) {
			skipped++
			continue
		}

		newPlain := seed.PatientMedicalHistoryForKey(p.ID.Hex(), p.DiseaseTypes.BloodPressure, p.DiseaseTypes.Glucose)
		if strings.TrimSpace(newPlain) == strings.TrimSpace(currentPlain) {
			skipped++
			continue
		}

		diseaseLabel := diseaseLabel(p.DiseaseTypes.BloodPressure, p.DiseaseTypes.Glucose)
		log.Printf("[migrate-patient-medical-history] %s (%s) [%s]: %q → %q",
			p.Email, p.Name, diseaseLabel, truncateRunes(currentPlain, 48), truncateRunes(newPlain, 72))

		if !dryRun {
			enc, err := crypto.Encrypt(newPlain)
			if err != nil {
				return fmt.Errorf("encrypt medicalHistory %s: %w", p.Email, err)
			}
			if _, err := col.UpdateByID(ctx, p.ID, bson.M{"$set": bson.M{
				"medicalHistory": enc,
				"updatedAt":      now,
			}}); err != nil {
				return fmt.Errorf("update %s: %w", p.Email, err)
			}
		}
		updated++
	}
	if err := cursor.Err(); err != nil {
		return err
	}

	log.Printf("[migrate-patient-medical-history] scanned=%d updated=%d skipped=%d", scanned, updated, skipped)
	if dryRun {
		log.Printf("[migrate-patient-medical-history] dry-run only; re-run without --dry-run to apply")
	}
	return nil
}

func diseaseLabel(bp, glu bool) string {
	switch {
	case bp && glu:
		return "THA+ĐTĐ"
	case bp:
		return "THA"
	case glu:
		return "ĐTĐ"
	default:
		return "none"
	}
}

func truncateRunes(s string, max int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= max {
		return string(r)
	}
	return string(r[:max]) + "…"
}
