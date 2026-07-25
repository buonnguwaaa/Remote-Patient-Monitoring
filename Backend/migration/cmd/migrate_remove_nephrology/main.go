package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
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

const (
	nephroDeptName = "Khoa Thận - Tiết niệu"
	nephroSpec     = "Thận - Tiết niệu"
)

var targetDeptNames = []string{
	"Khoa Tim mạch",
	"Khoa Nội Tổng quát",
	"Khoa Nội tiết",
}

// Removes "Khoa Thận - Tiết niệu", redistributes its doctors/nurses evenly
// across Tim mạch / Nội Tổng quát / Nội tiết, then aligns affected patients
// (diseaseTypes + medicalHistory) and remaps care-team collections.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_remove_nephrology --dry-run
//	go run ./migration/cmd/migrate_remove_nephrology
//	go run ./migration/cmd/migrate_remove_nephrology --env=.env.production --dry-run
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
		log.Printf("[migrate-remove-nephrology] no %s found, using environment variables", envFile)
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-remove-nephrology] connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-remove-nephrology] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if err := run(ctx, config.Mongo.Database, dryRun); err != nil {
		log.Fatalf("[migrate-remove-nephrology] failed: %v", err)
	}
}

type staffUser struct {
	ID             primitive.ObjectID `bson:"_id"`
	Name           string             `bson:"name"`
	Email          string             `bson:"email"`
	Role           string             `bson:"role"`
	DepartmentID   primitive.ObjectID `bson:"departmentId"`
	Specialization string             `bson:"specialization"`
}

type patientUser struct {
	ID   primitive.ObjectID `bson:"_id"`
	Name string             `bson:"name"`
	Email string            `bson:"email"`
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
	log.Printf("[migrate-remove-nephrology] mode=%s db=%s", mode, db.Name())

	crypto, err := util.LoadFieldEncryptorFromEnv()
	if err != nil {
		log.Printf("[migrate-remove-nephrology] WARN field encryption unavailable: %v", err)
		crypto = util.NewNoopFieldEncryptor()
	}

	now := time.Now().UTC()
	deptsCol := db.Collection("departments")
	usersCol := db.Collection("users")

	// ── Resolve departments ──────────────────────────────────────────────
	nephroID, err := findDeptID(ctx, deptsCol, nephroDeptName)
	if err != nil {
		return err
	}
	targetIDs := make([]primitive.ObjectID, 0, len(targetDeptNames))
	targetIDByName := map[string]primitive.ObjectID{}
	for _, name := range targetDeptNames {
		id, err := ensureDept(ctx, deptsCol, name, dryRun, now)
		if err != nil {
			return err
		}
		targetIDs = append(targetIDs, id)
		targetIDByName[name] = id
		log.Printf("[migrate-remove-nephrology] target dept %q (%s)", name, id.Hex())
	}

	// ── Load nephrology staff ────────────────────────────────────────────
	nephroDoctors, nephroNurses, err := loadNephroStaff(ctx, usersCol, nephroID)
	if err != nil {
		return err
	}
	log.Printf("[migrate-remove-nephrology] nephrology doctors=%d nurses=%d (deptID=%s present=%v)",
		len(nephroDoctors), len(nephroNurses), nephroID.Hex(), nephroID != primitive.NilObjectID)

	if len(nephroDoctors) == 0 && len(nephroNurses) == 0 && nephroID == primitive.NilObjectID {
		log.Printf("[migrate-remove-nephrology] nothing to do — no nephrology dept/staff")
		return nil
	}

	movedDoctorIDs := map[primitive.ObjectID]staffUser{}
	movedNurseIDs := map[primitive.ObjectID]staffUser{}
	for _, d := range nephroDoctors {
		movedDoctorIDs[d.ID] = d
	}
	for _, n := range nephroNurses {
		movedNurseIDs[n.ID] = n
	}

	// ── Audit: patients assigned to nephrology staff ─────────────────────
	assignByPatient, err := loadAssignments(ctx, db)
	if err != nil {
		return err
	}
	patientsByID, err := loadPatientsByID(ctx, usersCol)
	if err != nil {
		return err
	}
	staffByID, err := loadAllStaffByID(ctx, usersCol)
	if err != nil {
		return err
	}

	affectedAssigns := make([]assignmentDoc, 0)
	seenAssign := map[primitive.ObjectID]bool{}
	log.Printf("[migrate-remove-nephrology] === AUDIT: assignments involving nephrology staff ===")
	for _, a := range assignByPatient {
		_, docNephro := movedDoctorIDs[a.DoctorID]
		_, nurseNephro := movedNurseIDs[a.NurseID]
		if !docNephro && !nurseNephro {
			continue
		}
		if seenAssign[a.ID] {
			continue
		}
		seenAssign[a.ID] = true
		affectedAssigns = append(affectedAssigns, a)

		p := patientsByID[a.PatientID]
		doc := staffByID[a.DoctorID]
		nurse := staffByID[a.NurseID]
		log.Printf("[migrate-remove-nephrology] patient=%s (%s) disease=bp:%v/glu:%v | doctor=%s (%s/%s) | nurse=%s (%s)",
			p.Email, p.Name, p.DiseaseTypes.BloodPressure, p.DiseaseTypes.Glucose,
			doc.Email, doc.Specialization, shortDept(doc.DepartmentID, nephroID, targetIDByName),
			nurse.Email, shortDept(nurse.DepartmentID, nephroID, targetIDByName))
	}
	sort.Slice(affectedAssigns, func(i, j int) bool {
		return patientsByID[affectedAssigns[i].PatientID].Email < patientsByID[affectedAssigns[j].PatientID].Email
	})
	log.Printf("[migrate-remove-nephrology] affected patients/assignments=%d", len(affectedAssigns))

	// ── Phase 1: redistribute nephrology doctors evenly ──────────────────
	sort.Slice(nephroDoctors, func(i, j int) bool { return nephroDoctors[i].Email < nephroDoctors[j].Email })
	doctorNewDept := map[primitive.ObjectID]string{} // id -> target dept name
	for i, d := range nephroDoctors {
		targetName := targetDeptNames[i%len(targetDeptNames)]
		targetID := targetIDByName[targetName]
		wantSpec := strings.TrimPrefix(targetName, "Khoa ")
		doctorNewDept[d.ID] = targetName
		log.Printf("[migrate-remove-nephrology] move doctor %s -> %s (spec=%s)", d.Email, targetName, wantSpec)
		if !dryRun {
			if _, err := usersCol.UpdateByID(ctx, d.ID, bson.M{"$set": bson.M{
				"departmentId":   targetID,
				"specialization": wantSpec,
				"updatedAt":      now,
			}}); err != nil {
				return fmt.Errorf("move doctor %s: %w", d.Email, err)
			}
		}
		d.DepartmentID = targetID
		d.Specialization = wantSpec
		movedDoctorIDs[d.ID] = d
		staffByID[d.ID] = d
	}

	// ── Phase 2: redistribute nephrology nurses evenly ───────────────────
	sort.Slice(nephroNurses, func(i, j int) bool { return nephroNurses[i].Email < nephroNurses[j].Email })
	for i, n := range nephroNurses {
		targetName := targetDeptNames[i%len(targetDeptNames)]
		targetID := targetIDByName[targetName]
		log.Printf("[migrate-remove-nephrology] move nurse %s -> %s", n.Email, targetName)
		if !dryRun {
			if _, err := usersCol.UpdateByID(ctx, n.ID, bson.M{"$set": bson.M{
				"departmentId": targetID,
				"updatedAt":    now,
			}}); err != nil {
				return fmt.Errorf("move nurse %s: %w", n.Email, err)
			}
		}
		n.DepartmentID = targetID
		movedNurseIDs[n.ID] = n
		staffByID[n.ID] = n
	}

	// Reload all nurses for same-dept picking (includes newly moved).
	allNurses := make([]staffUser, 0)
	for _, s := range staffByID {
		if s.Role == string(userDomain.RoleNurse) {
			allNurses = append(allNurses, s)
		}
	}
	sort.Slice(allNurses, func(i, j int) bool { return allNurses[i].Email < allNurses[j].Email })

	nurseRR := map[string]int{}
	var patientsUpdated, careTeamsRemapped int

	// ── Phase 3: align affected patients + care teams ────────────────────
	for _, a := range affectedAssigns {
		doctor := staffByID[a.DoctorID]
		// If assignment doctor was not nephrology but nurse was, doctor stays;
		// disease still aligned to current doctor specialty.
		spec := strings.TrimSpace(doctor.Specialization)
		if name, ok := doctorNewDept[doctor.ID]; ok {
			spec = strings.TrimPrefix(name, "Khoa ")
		}
		bp, glu := diseaseForSpecialty(spec)
		historyPlain := seed.PatientMedicalHistoryForKey(a.PatientID.Hex(), bp, glu)
		historyEnc, err := crypto.Encrypt(historyPlain)
		if err != nil {
			return fmt.Errorf("encrypt medicalHistory %s: %w", a.PatientID.Hex(), err)
		}

		p := patientsByID[a.PatientID]
		log.Printf("[migrate-remove-nephrology] patient %s (%s): disease -> bp=%v glu=%v (doctor spec=%s)",
			p.Email, p.Name, bp, glu, spec)

		newNurse := staffByID[a.NurseID]
		if newNurse.DepartmentID != doctor.DepartmentID {
			picked, err := pickNurseSameDept(allNurses, doctor.DepartmentID, nurseRR)
			if err != nil {
				return fmt.Errorf("pick nurse for %s: %w", p.Email, err)
			}
			log.Printf("[migrate-remove-nephrology] patient %s: nurse %s -> %s (match doctor dept)",
				p.Email, newNurse.Email, picked.Email)
			newNurse = picked
		}

		if !dryRun {
			if _, err := usersCol.UpdateByID(ctx, a.PatientID, bson.M{"$set": bson.M{
				"diseaseTypes.bloodPressure": bp,
				"diseaseTypes.glucose":       glu,
				"medicalHistory":             historyEnc,
				"updatedAt":                  now,
			}}); err != nil {
				return fmt.Errorf("update patient disease %s: %w", p.Email, err)
			}

			if err := alignThresholds(ctx, db, a.PatientID, bp, glu, now); err != nil {
				return fmt.Errorf("thresholds %s: %w", p.Email, err)
			}

			if err := remapPatientCareTeam(ctx, db, a, doctor, newNurse, now); err != nil {
				return fmt.Errorf("remap care team %s: %w", p.Email, err)
			}
		}
		patientsUpdated++
		careTeamsRemapped++
	}

	// ── Phase 4: delete nephrology department ────────────────────────────
	if nephroID != primitive.NilObjectID {
		// Safety: no staff should remain on this dept after moves.
		left, err := usersCol.CountDocuments(ctx, bson.M{
			"departmentId": nephroID,
			"role":         bson.M{"$in": []string{string(userDomain.RoleDoctor), string(userDomain.RoleNurse)}},
		})
		if err != nil {
			return err
		}
		if left > 0 && !dryRun {
			return fmt.Errorf("refusing to delete %s: %d staff still assigned", nephroDeptName, left)
		}
		log.Printf("[migrate-remove-nephrology] delete department %q (%s) remainingStaff=%d",
			nephroDeptName, nephroID.Hex(), left)
		if !dryRun {
			if _, err := deptsCol.DeleteOne(ctx, bson.M{"_id": nephroID}); err != nil {
				return fmt.Errorf("delete department: %w", err)
			}
		}
	}

	log.Printf("[migrate-remove-nephrology] done: movedDoctors=%d movedNurses=%d patientsAligned=%d careTeams=%d",
		len(nephroDoctors), len(nephroNurses), patientsUpdated, careTeamsRemapped)
	if dryRun {
		log.Printf("[migrate-remove-nephrology] dry-run only; re-run without --dry-run to apply")
	}
	return nil
}

func diseaseForSpecialty(spec string) (bp, glucose bool) {
	switch strings.TrimSpace(spec) {
	case "Tim mạch":
		return true, false
	case "Nội tiết":
		return false, true
	case "Nội Tổng quát", "Nội Tổng hợp":
		return true, true
	default:
		// Fallback for any leftover specialty: general internal medicine.
		return true, true
	}
}

func alignThresholds(ctx context.Context, db *mongo.Database, patientID primitive.ObjectID, bp, glu bool, now time.Time) error {
	// Keep vital-sign thresholds; only toggle glucose bounds to match disease.
	filter := bson.M{"patientId": patientID}
	if glu {
		gMin, gMax := 70.0, 180.0
		_, err := db.Collection("thresholds").UpdateMany(ctx, filter, bson.M{
			"$set": bson.M{
				"glucoseMin": gMin,
				"glucoseMax": gMax,
				"updatedAt":  now,
			},
		})
		return err
	}
	_, err := db.Collection("thresholds").UpdateMany(ctx, filter, bson.M{
		"$unset": bson.M{"glucoseMin": "", "glucoseMax": ""},
		"$set":   bson.M{"updatedAt": now},
	})
	_ = bp // BP thresholds (sys/dia) remain as general vitals for all cohorts.
	return err
}

func pickNurseSameDept(nurses []staffUser, doctorDept primitive.ObjectID, rr map[string]int) (staffUser, error) {
	key := doctorDept.Hex()
	pool := make([]staffUser, 0)
	for _, n := range nurses {
		if n.DepartmentID == doctorDept {
			pool = append(pool, n)
		}
	}
	if len(pool) == 0 {
		pool = append([]staffUser(nil), nurses...)
		key = "*"
	}
	if len(pool) == 0 {
		return staffUser{}, fmt.Errorf("no nurses available")
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

	if oldDoctorID != newDoctor.ID {
		if _, err := db.Collection("thresholds").UpdateMany(ctx,
			bson.M{"patientId": patientID},
			bson.M{"$set": bson.M{"doctorId": newDoctor.ID, "updatedAt": now}},
		); err != nil {
			return fmt.Errorf("thresholds doctorId: %w", err)
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
			return fmt.Errorf("follow_up doctorId: %w", err)
		}
		if _, err := db.Collection("follow_up_appointments").UpdateMany(ctx,
			bson.M{"patientId": patientID, "createdBy": oldDoctorID},
			bson.M{"$set": bson.M{"createdBy": newDoctor.ID, "updatedAt": now}},
		); err != nil {
			return fmt.Errorf("follow_up createdBy: %w", err)
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
		if err := remapConversations(ctx, db, patientID, oldDoctorID, newDoctor.ID, now); err != nil {
			return err
		}
	}
	return nil
}

func remapConversations(
	ctx context.Context,
	db *mongo.Database,
	patientID, oldDoctorID, newDoctorID primitive.ObjectID,
	now time.Time,
) error {
	if oldDoctorID == newDoctorID {
		return nil
	}
	cur, err := db.Collection("conversations").Find(ctx, bson.M{
		"participants.userId": bson.M{"$all": []primitive.ObjectID{patientID, oldDoctorID}},
	})
	if err != nil {
		return fmt.Errorf("find conversations: %w", err)
	}
	defer cur.Close(ctx)

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
				return err
			}
			if _, err := db.Collection("conversations").DeleteOne(ctx, bson.M{"_id": convID}); err != nil {
				return err
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
			return err
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
	return err
}

func findDeptID(ctx context.Context, col *mongo.Collection, name string) (primitive.ObjectID, error) {
	var doc bson.M
	err := col.FindOne(ctx, bson.M{"name": name}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return primitive.NilObjectID, nil
	}
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("find dept %q: %w", name, err)
	}
	return doc["_id"].(primitive.ObjectID), nil
}

func ensureDept(ctx context.Context, col *mongo.Collection, name string, dryRun bool, now time.Time) (primitive.ObjectID, error) {
	id, err := findDeptID(ctx, col, name)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if id != primitive.NilObjectID {
		return id, nil
	}
	id = primitive.NewObjectID()
	log.Printf("[migrate-remove-nephrology] create missing dept %q (%s)", name, id.Hex())
	if dryRun {
		return id, nil
	}
	_, err = col.InsertOne(ctx, bson.M{
		"_id":         id,
		"name":        name,
		"description": fmt.Sprintf("%s trực thuộc hệ thống theo dõi bệnh nhân từ xa", name),
		"createdAt":   now,
		"updatedAt":   now,
	})
	return id, err
}

func loadNephroStaff(ctx context.Context, col *mongo.Collection, nephroID primitive.ObjectID) (doctors, nurses []staffUser, err error) {
	filter := bson.M{
		"role": bson.M{"$in": []string{string(userDomain.RoleDoctor), string(userDomain.RoleNurse)}},
		"$or": []bson.M{
			{"specialization": nephroSpec},
		},
	}
	if nephroID != primitive.NilObjectID {
		filter["$or"] = append(filter["$or"].([]bson.M), bson.M{"departmentId": nephroID})
	}

	cur, err := col.Find(ctx, filter, options.Find().SetProjection(bson.M{
		"_id": 1, "name": 1, "email": 1, "role": 1, "departmentId": 1, "specialization": 1,
	}))
	if err != nil {
		return nil, nil, err
	}
	defer cur.Close(ctx)

	var all []staffUser
	if err := cur.All(ctx, &all); err != nil {
		return nil, nil, err
	}
	seen := map[primitive.ObjectID]bool{}
	for _, s := range all {
		if seen[s.ID] {
			continue
		}
		seen[s.ID] = true
		switch s.Role {
		case string(userDomain.RoleDoctor):
			doctors = append(doctors, s)
		case string(userDomain.RoleNurse):
			nurses = append(nurses, s)
		}
	}
	return doctors, nurses, nil
}

func loadAssignments(ctx context.Context, db *mongo.Database) (map[primitive.ObjectID]assignmentDoc, error) {
	cur, err := db.Collection("assignments").Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
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

func loadPatientsByID(ctx context.Context, col *mongo.Collection) (map[primitive.ObjectID]patientUser, error) {
	cur, err := col.Find(ctx, bson.M{"role": string(userDomain.RolePatient)}, options.Find().SetProjection(bson.M{
		"_id": 1, "name": 1, "email": 1, "diseaseTypes": 1,
	}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var rows []patientUser
	if err := cur.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[primitive.ObjectID]patientUser, len(rows))
	for _, p := range rows {
		out[p.ID] = p
	}
	return out, nil
}

func loadAllStaffByID(ctx context.Context, col *mongo.Collection) (map[primitive.ObjectID]staffUser, error) {
	cur, err := col.Find(ctx, bson.M{
		"role": bson.M{"$in": []string{string(userDomain.RoleDoctor), string(userDomain.RoleNurse)}},
	}, options.Find().SetProjection(bson.M{
		"_id": 1, "name": 1, "email": 1, "role": 1, "departmentId": 1, "specialization": 1,
	}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var rows []staffUser
	if err := cur.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[primitive.ObjectID]staffUser, len(rows))
	for _, s := range rows {
		out[s.ID] = s
	}
	return out, nil
}

func shortDept(id, nephroID primitive.ObjectID, targets map[string]primitive.ObjectID) string {
	if id == nephroID && nephroID != primitive.NilObjectID {
		return nephroSpec
	}
	for name, tid := range targets {
		if id == tid {
			return strings.TrimPrefix(name, "Khoa ")
		}
	}
	return id.Hex()
}
