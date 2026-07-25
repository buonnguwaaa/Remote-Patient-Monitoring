package main

import (
	"context"
	"log"
	"os"
	"sort"
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

// Aligns yearsOfExperience with academic title / degree / professional qualification
// for doctors. Safe to re-run: doctors already inside the expected range are skipped.
//
// Expected ranges (Vietnam medical career norms, highest credential wins):
//
//	GS   → 22–40
//	PGS  → 16–32
//	TS / CKII → 12–28
//	ThS / CKI → 6–18
//	Nội trú → 1–6
//	BS/CN → 2–12
//	default → 1–15
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_doctor_experience --dry-run
//	go run ./migration/cmd/migrate_doctor_experience
//	go run ./migration/cmd/migrate_doctor_experience --env=.env.production --dry-run
func main() {
	dryRun := false
	envFile := ".env"
	for _, arg := range os.Args[1:] {
		switch {
		case arg == "--dry-run":
			dryRun = true
		case strings.HasPrefix(arg, "--env="):
			envFile = strings.TrimPrefix(arg, "--env=")
		}
	}

	if err := godotenv.Load(envFile); err != nil {
		log.Printf("[migrate-doctor-experience] no %s found, using environment variables", envFile)
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-doctor-experience] could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-doctor-experience] disconnect error: %v", err)
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
			"yearsOfExperience":         1,
			"academicDegree":            1,
			"professionalQualification": 1,
			"academicTitle":             1,
		}))
	if err != nil {
		log.Fatalf("[migrate-doctor-experience] find: %v", err)
	}
	defer cursor.Close(ctx)

	mode := "updated"
	if dryRun {
		mode = "dry-run would update"
	}

	var scanned, updated, skipped int
	byBucket := map[string]bucketStats{}

	for cursor.Next(ctx) {
		var doc doctorExpDoc
		if err := cursor.Decode(&doc); err != nil {
			log.Fatalf("[migrate-doctor-experience] decode: %v", err)
		}
		scanned++

		r := seed.DoctorExperienceRange(doc.AcademicTitle, doc.AcademicDegree, doc.ProfessionalQualification)
		stats := byBucket[r.Label]
		stats.Count++
		stats.ExpSum += doc.YearsOfExperience
		if stats.Count == 1 || doc.YearsOfExperience < stats.ExpMin {
			stats.ExpMin = doc.YearsOfExperience
		}
		if doc.YearsOfExperience > stats.ExpMax {
			stats.ExpMax = doc.YearsOfExperience
		}
		byBucket[r.Label] = stats

		newExp := seed.FitYearsOfExperience(doc.ID.Hex(), doc.YearsOfExperience, r)
		if newExp == doc.YearsOfExperience {
			skipped++
			continue
		}

		cred := credentialLabel(doc.AcademicTitle, doc.AcademicDegree, doc.ProfessionalQualification)

		if dryRun {
			log.Printf("[migrate-doctor-experience] dry-run %s (%s) %s: yearsOfExperience %d → %d (expect %d–%d for %s)",
				doc.ID.Hex(), doc.Email, doc.Name, doc.YearsOfExperience, newExp, r.Min, r.Max, cred)
			updated++
			continue
		}

		if _, err := col.UpdateByID(ctx, doc.ID, bson.M{"$set": bson.M{
			"yearsOfExperience": newExp,
			"updatedAt":         time.Now().UTC(),
		}}); err != nil {
			log.Fatalf("[migrate-doctor-experience] update %s: %v", doc.ID.Hex(), err)
		}
		log.Printf("[migrate-doctor-experience] updated %s (%s) %s: yearsOfExperience %d → %d (expect %d–%d for %s)",
			doc.ID.Hex(), doc.Email, doc.Name, doc.YearsOfExperience, newExp, r.Min, r.Max, cred)
		updated++
	}
	if err := cursor.Err(); err != nil {
		log.Fatalf("[migrate-doctor-experience] cursor: %v", err)
	}

	log.Printf("[migrate-doctor-experience] db=%s scanned=%d %s=%d skipped=%d",
		config.Mongo.Database.Name(), scanned, mode, updated, skipped)

	keys := make([]string, 0, len(byBucket))
	for k := range byBucket {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		s := byBucket[k]
		avg := 0.0
		if s.Count > 0 {
			avg = float64(s.ExpSum) / float64(s.Count)
		}
		log.Printf("[migrate-doctor-experience] bucket %-8s n=%d exp_before min=%d max=%d avg=%.1f",
			k, s.Count, s.ExpMin, s.ExpMax, avg)
	}
}

type doctorExpDoc struct {
	ID                        primitive.ObjectID                   `bson:"_id"`
	Name                      string                               `bson:"name"`
	Email                     string                               `bson:"email"`
	YearsOfExperience         int                                  `bson:"yearsOfExperience"`
	AcademicDegree            userDomain.AcademicDegree            `bson:"academicDegree"`
	ProfessionalQualification userDomain.ProfessionalQualification `bson:"professionalQualification"`
	AcademicTitle             userDomain.AcademicTitle             `bson:"academicTitle"`
}

type bucketStats struct {
	Count  int
	ExpMin int
	ExpMax int
	ExpSum int
}

func credentialLabel(
	title userDomain.AcademicTitle,
	degree userDomain.AcademicDegree,
	qual userDomain.ProfessionalQualification,
) string {
	parts := make([]string, 0, 3)
	if t := title.Label(); t != "" {
		parts = append(parts, t)
	}
	if d := degree.Label(); d != "" {
		parts = append(parts, d)
	}
	if q := qual.Label(); q != "" {
		parts = append(parts, q)
	}
	if len(parts) == 0 {
		return "(không có)"
	}
	return strings.Join(parts, " / ")
}
