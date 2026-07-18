package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Migrates legacy plaintext sensitive fields to AES-GCM ciphertext (rpm1:...).
// Safe to re-run: already-encrypted values are skipped.
//
//	Users (all roles): phone
//	Patients: cccd, insuranceNumber, medicalHistory, emergencyContact*
//	Staff (doctor/nurse): licenseNumber
//	Messages: content
//
// Usage (from Backend/):
//
//	go run ./cmd/migrate_phi_encrypt
//	go run ./cmd/migrate_phi_encrypt --dry-run
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-phi] no .env file found, using environment variables")
	}

	crypto, err := util.LoadFieldEncryptorFromEnv()
	if err != nil {
		log.Fatalf("[migrate-phi] %v", err)
	}
	if !crypto.Enabled() {
		log.Fatal("[migrate-phi] FIELD_ENCRYPTION_KEY is empty; set it in .env before migrating")
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-phi] could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-phi] disconnect error: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	users := config.Mongo.Database.Collection("users")
	messages := config.Mongo.Database.Collection("messages")

	patientFields := []string{
		"phone",
		"insuranceNumber",
		"cccd",
		"medicalHistory",
		"emergencyContactName",
		"emergencyContactPhone",
	}
	staffFields := []string{"phone", "licenseNumber"}
	adminFields := []string{"phone"}

	mode := "migrated"
	if dryRun {
		mode = "dry-run would migrate"
	}

	for _, job := range []struct {
		label  string
		role   domain.Role
		fields []string
	}{
		{"patients", domain.RolePatient, patientFields},
		{"doctors", domain.RoleDoctor, staffFields},
		{"nurses", domain.RoleNurse, staffFields},
		{"admins", domain.RoleAdmin, adminFields},
	} {
		scanned, updated, skipped, fieldCount := migrateCollection(ctx, users, bson.M{"role": job.role}, job.fields, crypto, dryRun, true)
		log.Printf("[migrate-phi] %s: scanned=%d %s=%d skipped=%d fields=%d",
			job.label, scanned, mode, updated, skipped, fieldCount)
	}

	msgScanned, msgUpdated, msgSkipped, msgFields := migrateCollection(ctx, messages, bson.M{}, []string{"content"}, crypto, dryRun, false)
	log.Printf("[migrate-phi] messages: scanned=%d %s=%d skipped=%d fields=%d",
		msgScanned, mode, msgUpdated, msgSkipped, msgFields)
}

func migrateCollection(
	ctx context.Context,
	col *mongo.Collection,
	filter bson.M,
	fields []string,
	crypto util.FieldEncryptor,
	dryRun bool,
	setUpdatedAt bool,
) (scanned, updated, skipped, fieldCount int) {
	projection := bson.M{"_id": 1}
	for _, f := range fields {
		projection[f] = 1
	}

	cursor, err := col.Find(ctx, filter, options.Find().SetProjection(projection))
	if err != nil {
		log.Fatalf("[migrate-phi] find: %v", err)
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			log.Fatalf("[migrate-phi] decode: %v", err)
		}
		scanned++

		id, ok := doc["_id"].(primitive.ObjectID)
		if !ok {
			log.Printf("[migrate-phi] skip doc with invalid _id")
			continue
		}

		set := bson.M{}
		for _, field := range fields {
			raw, _ := doc[field].(string)
			if raw == "" || util.IsPHIFieldEncrypted(raw) {
				continue
			}
			encrypted, err := crypto.Encrypt(raw)
			if err != nil {
				log.Fatalf("[migrate-phi] encrypt %s for %s: %v", field, id.Hex(), err)
			}
			set[field] = encrypted
			fieldCount++
		}

		if len(set) == 0 {
			skipped++
			continue
		}

		if dryRun {
			log.Printf("[migrate-phi] dry-run would update %s (%d fields)", id.Hex(), len(set))
			updated++
			continue
		}

		if setUpdatedAt {
			set["updatedAt"] = time.Now().UTC()
		}
		if _, err := col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": set}); err != nil {
			log.Fatalf("[migrate-phi] update %s: %v", id.Hex(), err)
		}
		updated++
	}
	if err := cursor.Err(); err != nil {
		log.Fatalf("[migrate-phi] cursor: %v", err)
	}
	return scanned, updated, skipped, fieldCount
}
