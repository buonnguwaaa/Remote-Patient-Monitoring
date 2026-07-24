package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"sort"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Fills patients that currently have neither diseaseTypes.bloodPressure nor
// diseaseTypes.glucose with exactly one disease (alternating THA / ĐTĐ,
// starting with THA because BP-only patients are underrepresented), updates
// medicalHistory to match, then reassigns doctor/nurse and remaps related
// collections the same way as migrate_patient_care_team.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_fill_patient_disease --dry-run
//	go run ./migration/cmd/migrate_fill_patient_disease
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-fill-patient-disease] no .env file found, using environment variables")
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-fill-patient-disease] connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-fill-patient-disease] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()

	if err := run(ctx, config.Mongo.Database, dryRun); err != nil {
		log.Fatalf("[migrate-fill-patient-disease] failed: %v", err)
	}
}

type staffUser struct {
	ID             primitive.ObjectID `bson:"_id"`
	Email          string             `bson:"email"`
	Role           string             `bson:"role"`
	DepartmentID   primitive.ObjectID `bson:"departmentId"`
	Specialization string             `bson:"specialization"`
}

type patientUser struct {
	ID        primitive.ObjectID `bson:"_id"`
	Email     string             `bson:"email"`
	DiseaseTypes struct {
		BloodPressure bool `bson:"bloodPressure"`
		Glucose       bool `bson:"glucose"`
	} `bson:"diseaseTypes"`
}

type assignmentDoc struct {
	ID        primitive.ObjectID `bson:"_id"`
	PatientID primitive.ObjectID `bson:"patientId"`
	DoctorID  primitive.ObjectID `bson:"doctorId"`
	NurseID   primitive.ObjectID `bson:"nurseId"`
}

func run(ctx context.Context, db *mongo.Database, dryRun bool) error {
	mode := "APPLY"
	if dryRun {
		mode = "DRY-RUN"
	}
	log.Printf("[migrate-fill-patient-disease] mode=%s db=%s", mode, db.Name())

	crypto, err := util.LoadFieldEncryptorFromEnv()
	if err != nil {
		log.Printf("[migrate-fill-patient-disease] WARN field encryption unavailable: %v (writing plaintext medicalHistory)", err)
		crypto = util.NewNoopFieldEncryptor()
	}

	doctors, err := loadStaff(ctx, db, string(userDomain.RoleDoctor))
	if err != nil {
		return err
	}
	nurses, err := loadStaff(ctx, db, string(userDomain.RoleNurse))
	if err != nil {
		return err
	}
	if len(doctors) == 0 || len(nurses) == 0 {
		return fmt.Errorf("need at least one doctor and one nurse")
	}

	adminID, err := loadAdminID(ctx, db)
	if err != nil {
		return err
	}

	patients, err := loadDiseaseLessPatients(ctx, db)
	if err != nil {
		return err
	}
	sort.Slice(patients, func(i, j int) bool { return patients[i].Email < patients[j].Email })
	log.Printf("[migrate-fill-patient-disease] disease-less patients: %d", len(patients))

	assignByPatient, err := loadAssignmentsByPatient(ctx, db)
	if err != nil {
		return err
	}

	doctorRR := map[string]int{}
	nurseRR := map[string]int{}
	now := time.Now().UTC()

	filledBP, filledGlu, reassigned, createdAssign := 0, 0, 0, 0

	for i, p := range patients {
		useBP := i%2 == 0 // alternate; start with THA (underrepresented)
		bp, glu := useBP, !useBP
		preferred := preferredSpecialty(bp, glu)
		historyPlain := seed.PatientMedicalHistoryForKey(p.ID.Hex(), bp, glu)
		historyEnc, err := crypto.Encrypt(historyPlain)
		if err != nil {
			return fmt.Errorf("encrypt medicalHistory for %s: %w", p.Email, err)
		}

		diseaseLabel := "bloodPressure"
		if glu {
			diseaseLabel = "glucose"
			filledGlu++
		} else {
			filledBP++
		}
		log.Printf("[migrate-fill-patient-disease] %s -> %s (preferred doctor specialty=%s)", p.Email, diseaseLabel, preferred)

		if !dryRun {
			if _, err := db.Collection("users").UpdateOne(ctx, bson.M{"_id": p.ID}, bson.M{
				"$set": bson.M{
					"diseaseTypes.bloodPressure": bp,
					"diseaseTypes.glucose":       glu,
					"medicalHistory":             historyEnc,
					"updatedAt":                  now,
				},
			}); err != nil {
				return fmt.Errorf("update diseaseTypes %s: %w", p.Email, err)
			}
		}

		newDoctor, err := pickDoctor(doctors, preferred, doctorRR)
		if err != nil {
			return err
		}
		newNurse, err := pickNurse(nurses, newDoctor.DepartmentID, nurseRR)
		if err != nil {
			return err
		}

		a, hasAssign := assignByPatient[p.ID]
		if !hasAssign {
			log.Printf("[migrate-fill-patient-disease] create assignment %s -> doctor=%s nurse=%s",
				p.Email, newDoctor.Email, newNurse.Email)
			if !dryRun {
				doc := assignmentDoc{
					ID:        primitive.NewObjectID(),
					PatientID: p.ID,
					DoctorID:  newDoctor.ID,
					NurseID:   newNurse.ID,
				}
				_, err := db.Collection("assignments").InsertOne(ctx, bson.M{
					"_id":        doc.ID,
					"patientId":  doc.PatientID,
					"doctorId":   doc.DoctorID,
					"nurseId":    doc.NurseID,
					"assignedBy": adminID,
					"createdAt":  now,
					"updatedAt":  now,
				})
				if err != nil {
					return fmt.Errorf("create assignment %s: %w", p.Email, err)
				}
				assignByPatient[p.ID] = doc
			}
			createdAssign++
			reassigned++
			continue
		}

		if a.DoctorID == newDoctor.ID && a.NurseID == newNurse.ID {
			log.Printf("[migrate-fill-patient-disease] care team already matched for %s", p.Email)
			continue
		}

		log.Printf("[migrate-fill-patient-disease] reassign %s: doctor %s -> %s (%s); nurse -> %s",
			p.Email, a.DoctorID.Hex(), newDoctor.Email, newDoctor.Specialization, newNurse.Email)

		if !dryRun {
			if err := remapPatientCareTeam(ctx, db, a, newDoctor, newNurse, now); err != nil {
				return fmt.Errorf("remap %s: %w", p.Email, err)
			}
			assignByPatient[p.ID] = assignmentDoc{
				ID:        a.ID,
				PatientID: a.PatientID,
				DoctorID:  newDoctor.ID,
				NurseID:   newNurse.ID,
			}
		}
		reassigned++
	}

	log.Printf("[migrate-fill-patient-disease] done: filledBP=%d filledGlucose=%d careTeamUpdated=%d assignmentsCreated=%d",
		filledBP, filledGlu, reassigned, createdAssign)
	if dryRun {
		log.Printf("[migrate-fill-patient-disease] dry-run only; re-run without --dry-run to apply")
	}
	return nil
}

func preferredSpecialty(bp, glucose bool) string {
	switch {
	case bp && glucose:
		return "Nội Tổng quát"
	case glucose:
		return "Nội tiết"
	case bp:
		return "Tim mạch"
	default:
		return "Nội Tổng quát"
	}
}

func pickDoctor(keepers []staffUser, preferred string, rr map[string]int) (staffUser, error) {
	ordered := []string{preferred, "Nội Tổng quát", "Tim mạch", "Nội tiết", "Thận - Tiết niệu"}
	seen := map[string]bool{}
	for _, spec := range ordered {
		if seen[spec] {
			continue
		}
		seen[spec] = true
		pool := make([]staffUser, 0)
		for _, d := range keepers {
			if d.Specialization == spec {
				pool = append(pool, d)
			}
		}
		if len(pool) == 0 {
			continue
		}
		sort.Slice(pool, func(i, j int) bool { return pool[i].Email < pool[j].Email })
		idx := rr[spec] % len(pool)
		rr[spec]++
		return pool[idx], nil
	}
	sort.Slice(keepers, func(i, j int) bool { return keepers[i].Email < keepers[j].Email })
	idx := rr["*"] % len(keepers)
	rr["*"]++
	return keepers[idx], nil
}

func pickNurse(keepers []staffUser, doctorDept primitive.ObjectID, rr map[string]int) (staffUser, error) {
	key := doctorDept.Hex()
	sameDept := make([]staffUser, 0)
	for _, n := range keepers {
		if n.DepartmentID == doctorDept {
			sameDept = append(sameDept, n)
		}
	}
	pool := sameDept
	if len(pool) == 0 {
		pool = append([]staffUser(nil), keepers...)
		key = "*"
	}
	sort.Slice(pool, func(i, j int) bool { return pool[i].Email < pool[j].Email })
	idx := rr[key] % len(pool)
	rr[key]++
	return pool[idx], nil
}

func remapPatientCareTeam(
	ctx context.Context,
	db *mongo.Database,
	a assignmentDoc,
	newDoctor, newNurse staffUser,
	now time.Time,
) error {
	oldDoctorID := a.DoctorID
	patientID := a.PatientID

	if _, err := db.Collection("assignments").UpdateOne(ctx, bson.M{"_id": a.ID}, bson.M{
		"$set": bson.M{
			"doctorId":  newDoctor.ID,
			"nurseId":   newNurse.ID,
			"updatedAt": now,
		},
	}); err != nil {
		return fmt.Errorf("assignments: %w", err)
	}

	if oldDoctorID == newDoctor.ID {
		return nil
	}

	if _, err := db.Collection("thresholds").UpdateMany(ctx,
		bson.M{"patientId": patientID},
		bson.M{"$set": bson.M{"doctorId": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("thresholds: %w", err)
	}
	if _, err := db.Collection("prescriptions").UpdateMany(ctx,
		bson.M{"patientId": patientID},
		bson.M{"$set": bson.M{"prescribedBy": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("prescriptions: %w", err)
	}
	if _, err := db.Collection("reminders").UpdateMany(ctx,
		bson.M{"patientId": patientID, "createdBy": oldDoctorID},
		bson.M{"$set": bson.M{"createdBy": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("reminders: %w", err)
	}
	if _, err := db.Collection("follow_up_appointments").UpdateMany(ctx,
		bson.M{"patientId": patientID},
		bson.M{"$set": bson.M{"doctorId": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("follow_up_appointments doctorId: %w", err)
	}
	if _, err := db.Collection("follow_up_appointments").UpdateMany(ctx,
		bson.M{"patientId": patientID, "createdBy": oldDoctorID},
		bson.M{"$set": bson.M{"createdBy": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("follow_up_appointments createdBy: %w", err)
	}
	if _, err := db.Collection("video_sessions").UpdateMany(ctx,
		bson.M{"patientId": patientID, "doctorId": oldDoctorID},
		bson.M{"$set": bson.M{"doctorId": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("video_sessions doctorId: %w", err)
	}
	if _, err := db.Collection("video_sessions").UpdateMany(ctx,
		bson.M{"patientId": patientID, "createdBy": oldDoctorID},
		bson.M{"$set": bson.M{"createdBy": newDoctor.ID, "updatedAt": now}},
	); err != nil {
		return fmt.Errorf("video_sessions createdBy: %w", err)
	}
	return remapConversations(ctx, db, patientID, oldDoctorID, newDoctor.ID, now)
}

func remapConversations(
	ctx context.Context,
	db *mongo.Database,
	patientID, oldDoctorID, newDoctorID primitive.ObjectID,
	now time.Time,
) error {
	cur, err := db.Collection("conversations").Find(ctx, bson.M{
		"participants.userId": bson.M{"$all": []primitive.ObjectID{patientID, oldDoctorID}},
	})
	if err != nil {
		return fmt.Errorf("find conversations: %w", err)
	}
	defer func() { _ = cur.Close(ctx) }()

	var convIDs []primitive.ObjectID
	for cur.Next(ctx) {
		var conv bson.M
		if err := cur.Decode(&conv); err != nil {
			return err
		}
		convID := conv["_id"].(primitive.ObjectID)

		existing, err := db.Collection("conversations").CountDocuments(ctx, bson.M{
			"_id":                 bson.M{"$ne": convID},
			"participants.userId": bson.M{"$all": []primitive.ObjectID{patientID, newDoctorID}},
		})
		if err != nil {
			return err
		}
		if existing > 0 {
			if _, err := db.Collection("messages").DeleteMany(ctx, bson.M{"conversationId": convID}); err != nil {
				return fmt.Errorf("delete duplicate conversation messages %s: %w", convID.Hex(), err)
			}
			if _, err := db.Collection("conversations").DeleteOne(ctx, bson.M{"_id": convID}); err != nil {
				return fmt.Errorf("delete duplicate conversation %s: %w", convID.Hex(), err)
			}
			continue
		}

		_, err = db.Collection("conversations").UpdateOne(
			ctx,
			bson.M{"_id": convID},
			bson.M{"$set": bson.M{
				"participants.$[p].userId": newDoctorID,
				"updatedAt":                now,
			}},
			options.Update().SetArrayFilters(options.ArrayFilters{
				Filters: []interface{}{bson.M{"p.userId": oldDoctorID}},
			}),
		)
		if err != nil {
			return fmt.Errorf("update conversation %s: %w", convID.Hex(), err)
		}
		convIDs = append(convIDs, convID)
	}
	if err := cur.Err(); err != nil {
		return err
	}
	if len(convIDs) == 0 {
		return nil
	}
	_, err = db.Collection("messages").UpdateMany(ctx,
		bson.M{"conversationId": bson.M{"$in": convIDs}, "senderId": oldDoctorID},
		bson.M{"$set": bson.M{"senderId": newDoctorID}},
	)
	if err != nil {
		return fmt.Errorf("messages sender remap: %w", err)
	}
	return nil
}

func loadDiseaseLessPatients(ctx context.Context, db *mongo.Database) ([]patientUser, error) {
	cur, err := db.Collection("users").Find(ctx, bson.M{
		"role": string(userDomain.RolePatient),
		"$and": []bson.M{
			{"diseaseTypes.bloodPressure": bson.M{"$ne": true}},
			{"diseaseTypes.glucose": bson.M{"$ne": true}},
		},
	}, options.Find().SetProjection(bson.M{
		"_id": 1, "email": 1, "diseaseTypes": 1,
	}))
	if err != nil {
		return nil, err
	}
	defer func() { _ = cur.Close(ctx) }()
	var out []patientUser
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func loadStaff(ctx context.Context, db *mongo.Database, role string) ([]staffUser, error) {
	cur, err := db.Collection("users").Find(ctx, bson.M{"role": role}, options.Find().SetProjection(bson.M{
		"_id": 1, "email": 1, "role": 1, "departmentId": 1, "specialization": 1,
	}))
	if err != nil {
		return nil, fmt.Errorf("load %s: %w", role, err)
	}
	defer func() { _ = cur.Close(ctx) }()
	var out []staffUser
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Email < out[j].Email })
	return out, nil
}

func loadAssignmentsByPatient(ctx context.Context, db *mongo.Database) (map[primitive.ObjectID]assignmentDoc, error) {
	cur, err := db.Collection("assignments").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = cur.Close(ctx) }()
	var rows []assignmentDoc
	if err := cur.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[primitive.ObjectID]assignmentDoc, len(rows))
	for _, a := range rows {
		out[a.PatientID] = a
	}
	return out, nil
}

func loadAdminID(ctx context.Context, db *mongo.Database) (primitive.ObjectID, error) {
	var u bson.M
	err := db.Collection("users").FindOne(ctx, bson.M{
		"role":  string(userDomain.RoleAdmin),
		"email": "admin@gmail.com",
	}, options.FindOne().SetProjection(bson.M{"_id": 1})).Decode(&u)
	if err == nil {
		return u["_id"].(primitive.ObjectID), nil
	}
	if err != mongo.ErrNoDocuments {
		return primitive.NilObjectID, err
	}
	err = db.Collection("users").FindOne(ctx, bson.M{"role": string(userDomain.RoleAdmin)},
		options.FindOne().SetProjection(bson.M{"_id": 1})).Decode(&u)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("find admin: %w", err)
	}
	return u["_id"].(primitive.ObjectID), nil
}