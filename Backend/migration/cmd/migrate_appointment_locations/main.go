package main

import (
	"context"
	"fmt"
	"hash/fnv"
	"log"
	"os"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Remaps follow_up_appointments.location to the web AppointmentPage clinic
// list, constrained by the patient's diseaseTypes:
//
//	both / neither → 315 + Thiên Phúc only
//	bloodPressure only → not nội tiết (Bích Đào)
//	glucose only → not tim mạch (Hồng Tâm)
//
// Appointments whose location already matches the allowlist are left alone.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_appointment_locations --dry-run
//	go run ./migration/cmd/migrate_appointment_locations
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-appointment-locations] no .env file found, using environment variables")
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-appointment-locations] connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-appointment-locations] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := run(ctx, config.Mongo.Database, dryRun); err != nil {
		log.Fatalf("[migrate-appointment-locations] failed: %v", err)
	}
}

type appointmentDoc struct {
	ID        primitive.ObjectID `bson:"_id"`
	PatientID primitive.ObjectID `bson:"patientId"`
	Location  string             `bson:"location"`
}

type patientDisease struct {
	BloodPressure bool
	Glucose       bool
}

func run(ctx context.Context, db *mongo.Database, dryRun bool) error {
	mode := "APPLY"
	if dryRun {
		mode = "DRY-RUN"
	}
	log.Printf("[migrate-appointment-locations] mode=%s db=%s", mode, db.Name())

	diseases, err := loadPatientDiseases(ctx, db)
	if err != nil {
		return err
	}
	log.Printf("[migrate-appointment-locations] patients with diseaseTypes loaded: %d", len(diseases))

	appts, err := loadAppointments(ctx, db)
	if err != nil {
		return err
	}
	log.Printf("[migrate-appointment-locations] appointments: %d", len(appts))

	var kept, updated, missingPatient int
	byOld := map[string]int{}
	byNew := map[string]int{}
	byDisease := map[string]int{}
	const maxDetailLogs = 25

	col := db.Collection("follow_up_appointments")
	for _, a := range appts {
		d, ok := diseases[a.PatientID]
		if !ok {
			missingPatient++
			// Unknown patient → treat as both/general (315 + Thiên Phúc).
			d = patientDisease{BloodPressure: true, Glucose: true}
		}
		diseaseLabel := formatDisease(d.BloodPressure, d.Glucose)

		if seed.IsClinicLocationAllowed(a.Location, d.BloodPressure, d.Glucose) {
			kept++
			byNew[a.Location]++
			byDisease[diseaseLabel+"|kept"]++
			continue
		}

		salt := stableSalt(a.ID.Hex())
		newLoc := seed.ClinicLocationForDisease(d.BloodPressure, d.Glucose, salt)
		byOld[emptyAsBlank(a.Location)]++
		byNew[newLoc]++
		byDisease[diseaseLabel+"|updated"]++
		updated++

		if updated <= maxDetailLogs {
			log.Printf("[migrate-appointment-locations] %s patient=%s disease=%s\n  old: %q\n  new: %q",
				a.ID.Hex(), a.PatientID.Hex(), diseaseLabel, a.Location, newLoc)
		}

		if dryRun {
			continue
		}
		res, err := col.UpdateOne(ctx,
			bson.M{"_id": a.ID},
			bson.M{"$set": bson.M{"location": newLoc, "updatedAt": time.Now().UTC()}},
		)
		if err != nil {
			return fmt.Errorf("update appointment %s: %w", a.ID.Hex(), err)
		}
		if res.MatchedCount == 0 {
			return fmt.Errorf("appointment %s not found on update", a.ID.Hex())
		}
	}
	if updated > maxDetailLogs {
		log.Printf("[migrate-appointment-locations] ...and %d more updates (detail truncated)", updated-maxDetailLogs)
	}

	log.Printf("[migrate-appointment-locations] summary: kept=%d updated=%d missingPatient=%d",
		kept, updated, missingPatient)
	log.Printf("[migrate-appointment-locations] by disease action:")
	for k, n := range byDisease {
		log.Printf("  %4d  %s", n, k)
	}
	log.Printf("[migrate-appointment-locations] dirty location tallies (before remap):")
	for loc, n := range byOld {
		log.Printf("  %4d  %s", n, loc)
	}
	log.Printf("[migrate-appointment-locations] final location tallies:")
	for _, loc := range seed.ClinicLocations {
		if n := byNew[loc]; n > 0 {
			log.Printf("  %4d  %s", n, loc)
		}
	}
	if dryRun {
		log.Printf("[migrate-appointment-locations] dry-run complete — no writes")
	} else {
		log.Printf("[migrate-appointment-locations] apply complete")
	}
	return nil
}

func loadAppointments(ctx context.Context, db *mongo.Database) ([]appointmentDoc, error) {
	cur, err := db.Collection("follow_up_appointments").Find(ctx, bson.M{},
		options.Find().SetProjection(bson.M{"_id": 1, "patientId": 1, "location": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []appointmentDoc
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func loadPatientDiseases(ctx context.Context, db *mongo.Database) (map[primitive.ObjectID]patientDisease, error) {
	cur, err := db.Collection("users").Find(ctx,
		bson.M{"role": string(userDomain.RolePatient)},
		options.Find().SetProjection(bson.M{
			"_id": 1, "diseaseTypes.bloodPressure": 1, "diseaseTypes.glucose": 1,
		}),
	)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	type row struct {
		ID           primitive.ObjectID `bson:"_id"`
		DiseaseTypes struct {
			BloodPressure bool `bson:"bloodPressure"`
			Glucose       bool `bson:"glucose"`
		} `bson:"diseaseTypes"`
	}

	out := make(map[primitive.ObjectID]patientDisease)
	for cur.Next(ctx) {
		var r row
		if err := cur.Decode(&r); err != nil {
			return nil, err
		}
		out[r.ID] = patientDisease{
			BloodPressure: r.DiseaseTypes.BloodPressure,
			Glucose:       r.DiseaseTypes.Glucose,
		}
	}
	return out, cur.Err()
}

func stableSalt(id string) int {
	h := fnv.New32a()
	_, _ = h.Write([]byte(id))
	return int(h.Sum32())
}

func formatDisease(bp, glu bool) string {
	switch {
	case bp && glu:
		return "both"
	case bp:
		return "bloodPressure"
	case glu:
		return "glucose"
	default:
		return "neither"
	}
}

func emptyAsBlank(s string) string {
	if s == "" {
		return "(empty)"
	}
	return s
}
