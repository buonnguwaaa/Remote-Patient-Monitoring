package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Reassigns patients to doctors/nurses whose specialty matches diseaseTypes,
// remaps dependent collections, then optionally prunes N highest-index seed
// doctor and nurse accounts (never deletes doctor@gmail.com / nurse@gmail.com
// or non-seed accounts).
//
// Does NOT drop the database.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_patient_care_team --dry-run
//	go run ./migration/cmd/migrate_patient_care_team
//	go run ./migration/cmd/migrate_patient_care_team --prune=20
//	go run ./migration/cmd/migrate_patient_care_team --skip-prune
//	go run ./migration/cmd/migrate_patient_care_team --skip-reassign --prune=20
func main() {
	opts := parseArgs(os.Args[1:])

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-patient-care-team] no .env file found, using environment variables")
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-patient-care-team] connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-patient-care-team] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if err := run(ctx, config.Mongo.Database, opts); err != nil {
		log.Fatalf("[migrate-patient-care-team] failed: %v", err)
	}
}

type runOpts struct {
	dryRun       bool
	skipReassign bool
	skipPrune    bool
	pruneCount   int
}

func parseArgs(args []string) runOpts {
	opts := runOpts{pruneCount: 20}
	for _, arg := range args {
		switch {
		case arg == "--dry-run":
			opts.dryRun = true
		case arg == "--skip-reassign":
			opts.skipReassign = true
		case arg == "--skip-prune":
			opts.skipPrune = true
		case strings.HasPrefix(arg, "--prune="):
			n, err := strconv.Atoi(strings.TrimPrefix(arg, "--prune="))
			if err != nil || n < 0 {
				log.Fatalf("[migrate-patient-care-team] invalid --prune value %q", arg)
			}
			opts.pruneCount = n
		default:
			log.Fatalf("[migrate-patient-care-team] unknown arg %q", arg)
		}
	}
	return opts
}

type staffUser struct {
	ID             primitive.ObjectID `bson:"_id"`
	Email          string             `bson:"email"`
	Role           string             `bson:"role"`
	DepartmentID   primitive.ObjectID `bson:"departmentId"`
	Specialization string             `bson:"specialization"`
}

type patientUser struct {
	ID           primitive.ObjectID `bson:"_id"`
	Email        string             `bson:"email"`
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

var seedStaffEmailRE = regexp.MustCompile(`^seed-(doctor|nurse)-(\d+)@rpm\.local$`)

func run(ctx context.Context, db *mongo.Database, opts runOpts) error {
	mode := "APPLY"
	if opts.dryRun {
		mode = "DRY-RUN"
	}
	log.Printf("[migrate-patient-care-team] mode=%s db=%s skipReassign=%v skipPrune=%v pruneCount=%d",
		mode, db.Name(), opts.skipReassign, opts.skipPrune, opts.pruneCount)

	doctors, err := loadStaff(ctx, db, string(userDomain.RoleDoctor))
	if err != nil {
		return err
	}
	nurses, err := loadStaff(ctx, db, string(userDomain.RoleNurse))
	if err != nil {
		return err
	}
	patients, err := loadPatients(ctx, db)
	if err != nil {
		return err
	}
	assignments, err := loadAssignments(ctx, db)
	if err != nil {
		return err
	}

	doctorByID := indexStaff(doctors)
	nurseByID := indexStaff(nurses)
	patientByID := map[primitive.ObjectID]patientUser{}
	for _, p := range patients {
		patientByID[p.ID] = p
	}

	doomedDoctors := pickSeedStaffToPrune(doctors, "doctor", opts.pruneCount, opts.skipPrune)
	doomedNurses := pickSeedStaffToPrune(nurses, "nurse", opts.pruneCount, opts.skipPrune)
	doomed := map[primitive.ObjectID]staffUser{}
	for _, d := range doomedDoctors {
		doomed[d.ID] = d
		log.Printf("[migrate-patient-care-team] prune candidate doctor %s (%s)", d.Email, d.ID.Hex())
	}
	for _, n := range doomedNurses {
		doomed[n.ID] = n
		log.Printf("[migrate-patient-care-team] prune candidate nurse %s (%s)", n.Email, n.ID.Hex())
	}

	keepersDoctors := filterKeepers(doctors, doomed)
	keepersNurses := filterKeepers(nurses, doomed)
	if len(keepersDoctors) == 0 {
		return fmt.Errorf("no keeper doctors left after prune selection")
	}
	if len(keepersNurses) == 0 {
		return fmt.Errorf("no keeper nurses left after prune selection")
	}

	doctorRR := map[string]int{}
	nurseRR := map[string]int{} // keyed by departmentId hex

	now := time.Now().UTC()
	stats := struct {
		scanned, unchanged, reassigned, prunedUsers int
	}{}

	for _, a := range assignments {
		stats.scanned++
		patient, ok := patientByID[a.PatientID]
		if !ok {
			log.Printf("[migrate-patient-care-team] WARN assignment %s missing patient %s", a.ID.Hex(), a.PatientID.Hex())
			continue
		}

		oldDoctor, hasOldDoctor := doctorByID[a.DoctorID]
		oldNurse, hasOldNurse := nurseByID[a.NurseID]

		needDoctorChange := false
		needNurseChange := false

		if _, doomedDoc := doomed[a.DoctorID]; doomedDoc || !hasOldDoctor {
			needDoctorChange = true
		}
		if _, doomedNurse := doomed[a.NurseID]; doomedNurse || !hasOldNurse {
			needNurseChange = true
		}

		preferred := preferredSpecialty(patient.DiseaseTypes.BloodPressure, patient.DiseaseTypes.Glucose)
		if hasOldDoctor && !needDoctorChange && !opts.skipReassign {
			if !specialtyMatches(oldDoctor.Specialization, preferred) {
				needDoctorChange = true
			}
		}
		if opts.skipReassign {
			// Only force moves required by prune / missing staff.
			if _, doomedDoc := doomed[a.DoctorID]; !doomedDoc && hasOldDoctor {
				needDoctorChange = false
			}
			if _, doomedNurse := doomed[a.NurseID]; !doomedNurse && hasOldNurse {
				needNurseChange = false
			}
		}

		if !needDoctorChange && !needNurseChange {
			stats.unchanged++
			continue
		}

		newDoctor := oldDoctor
		if needDoctorChange {
			picked, err := pickDoctor(keepersDoctors, preferred, patient.DiseaseTypes.BloodPressure, patient.DiseaseTypes.Glucose, doctorRR)
			if err != nil {
				return fmt.Errorf("patient %s: %w", patient.Email, err)
			}
			newDoctor = picked
		}

		newNurse := oldNurse
		if needNurseChange || (needDoctorChange && hasOldNurse && oldNurse.DepartmentID != newDoctor.DepartmentID) {
			picked, err := pickNurse(keepersNurses, newDoctor.DepartmentID, nurseRR)
			if err != nil {
				return fmt.Errorf("patient %s nurse: %w", patient.Email, err)
			}
			newNurse = picked
			needNurseChange = newNurse.ID != a.NurseID
		}

		if newDoctor.ID == a.DoctorID && newNurse.ID == a.NurseID {
			stats.unchanged++
			continue
		}

		log.Printf("[migrate-patient-care-team] reassign %s (bp=%v glucose=%v preferred=%s): doctor %s -> %s (%s); nurse %s -> %s",
			patient.Email,
			patient.DiseaseTypes.BloodPressure, patient.DiseaseTypes.Glucose, preferred,
			emailOrMissing(oldDoctor, hasOldDoctor), newDoctor.Email, newDoctor.Specialization,
			emailOrMissing(oldNurse, hasOldNurse), newNurse.Email,
		)

		if !opts.dryRun {
			if err := remapPatientCareTeam(ctx, db, a, newDoctor, newNurse, now); err != nil {
				return fmt.Errorf("remap %s: %w", patient.Email, err)
			}
		}
		stats.reassigned++
	}

	// Any remaining references on doomed staff (orphans without assignment coverage).
	if !opts.skipPrune && len(doomed) > 0 {
		doomedIDs := make([]primitive.ObjectID, 0, len(doomed))
		for id := range doomed {
			doomedIDs = append(doomedIDs, id)
		}
		if err := assertNoCareTeamRefs(ctx, db, doomedIDs, opts.dryRun); err != nil {
			return err
		}
		if err := cleanupDoomedStaffArtifacts(ctx, db, doomedIDs, opts.dryRun, now); err != nil {
			return err
		}
		if !opts.dryRun {
			res, err := db.Collection("users").DeleteMany(ctx, bson.M{"_id": bson.M{"$in": doomedIDs}})
			if err != nil {
				return fmt.Errorf("delete doomed users: %w", err)
			}
			stats.prunedUsers = int(res.DeletedCount)
		} else {
			stats.prunedUsers = len(doomedIDs)
		}
	}

	log.Printf("[migrate-patient-care-team] done: scanned=%d unchanged=%d reassigned=%d prunedUsers=%d",
		stats.scanned, stats.unchanged, stats.reassigned, stats.prunedUsers)
	if opts.dryRun {
		log.Printf("[migrate-patient-care-team] dry-run only; re-run without --dry-run to apply")
	}
	return nil
}

func emailOrMissing(s staffUser, ok bool) string {
	if !ok {
		return "<missing>"
	}
	return s.Email
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

func specialtyPreferenceList(bp, glucose bool) []string {
	switch {
	case bp && glucose:
		return []string{"Nội Tổng quát", "Tim mạch", "Nội tiết", "Thận - Tiết niệu"}
	case glucose:
		return []string{"Nội tiết", "Nội Tổng quát"}
	case bp:
		return []string{"Tim mạch", "Thận - Tiết niệu", "Nội Tổng quát"}
	default:
		return []string{"Nội Tổng quát", "Tim mạch", "Nội tiết", "Thận - Tiết niệu"}
	}
}

func specialtyMatches(spec, preferred string) bool {
	return strings.TrimSpace(spec) == preferred
}

func pickDoctor(keepers []staffUser, preferred string, bp, glucose bool, rr map[string]int) (staffUser, error) {
	prefs := specialtyPreferenceList(bp, glucose)
	// Ensure preferred is first.
	ordered := []string{preferred}
	for _, p := range prefs {
		if p != preferred {
			ordered = append(ordered, p)
		}
	}
	for _, spec := range ordered {
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
	// Absolute fallback: round-robin all keepers.
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
	oldNurseID := a.NurseID
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

		if err := remapConversations(ctx, db, patientID, oldDoctorID, newDoctor.ID, now); err != nil {
			return err
		}
	}

	_ = oldNurseID // nurse change is assignment-only; clinical docs are doctor-scoped
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

		// Always rewrite the old doctor participant so prune cannot leave
		// dangling user refs. If another thread with the new doctor already
		// exists, drop this duplicate conversation (+ its messages) instead.
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
			log.Printf("[migrate-patient-care-team] dropped duplicate conversation %s (new doctor thread exists)", convID.Hex())
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

func assertNoCareTeamRefs(ctx context.Context, db *mongo.Database, doomedIDs []primitive.ObjectID, dryRun bool) error {
	checks := []struct {
		col    string
		filter bson.M
	}{
		{"assignments", bson.M{"$or": []bson.M{
			{"doctorId": bson.M{"$in": doomedIDs}},
			{"nurseId": bson.M{"$in": doomedIDs}},
		}}},
		{"thresholds", bson.M{"doctorId": bson.M{"$in": doomedIDs}}},
		{"prescriptions", bson.M{"prescribedBy": bson.M{"$in": doomedIDs}}},
		{"reminders", bson.M{"createdBy": bson.M{"$in": doomedIDs}}},
		{"follow_up_appointments", bson.M{"$or": []bson.M{
			{"doctorId": bson.M{"$in": doomedIDs}},
			{"createdBy": bson.M{"$in": doomedIDs}},
		}}},
		{"video_sessions", bson.M{"$or": []bson.M{
			{"doctorId": bson.M{"$in": doomedIDs}},
			{"createdBy": bson.M{"$in": doomedIDs}},
		}}},
		{"conversations", bson.M{"participants.userId": bson.M{"$in": doomedIDs}}},
		{"messages", bson.M{"senderId": bson.M{"$in": doomedIDs}}},
	}

	var blockers []string
	for _, c := range checks {
		n, err := db.Collection(c.col).CountDocuments(ctx, c.filter)
		if err != nil {
			return fmt.Errorf("pre-delete check %s: %w", c.col, err)
		}
		if n > 0 {
			blockers = append(blockers, fmt.Sprintf("%s=%d", c.col, n))
		}
	}
	if len(blockers) == 0 {
		return nil
	}
	msg := fmt.Sprintf("doomed staff still referenced: %s", strings.Join(blockers, ", "))
	if dryRun {
		log.Printf("[migrate-patient-care-team] WARN %s (expected in dry-run before remap applies)", msg)
		return nil
	}
	return fmt.Errorf("%s; aborting user delete", msg)
}

func cleanupDoomedStaffArtifacts(ctx context.Context, db *mongo.Database, doomedIDs []primitive.ObjectID, dryRun bool, now time.Time) error {
	// Soft-clear alert acknowledgements pointing at doomed staff.
	if !dryRun {
		if _, err := db.Collection("alerts").UpdateMany(ctx,
			bson.M{"acknowledgedBy": bson.M{"$in": doomedIDs}},
			bson.M{"$unset": bson.M{"acknowledgedBy": ""}, "$set": bson.M{"updatedAt": now}},
		); err != nil {
			return fmt.Errorf("alerts acknowledgedBy: %w", err)
		}
		for _, col := range []string{"refresh_tokens", "notification_tokens", "notifications"} {
			if _, err := db.Collection(col).DeleteMany(ctx, bson.M{"userId": bson.M{"$in": doomedIDs}}); err != nil {
				return fmt.Errorf("cleanup %s: %w", col, err)
			}
		}
	} else {
		for _, col := range []string{"refresh_tokens", "notification_tokens", "notifications"} {
			n, _ := db.Collection(col).CountDocuments(ctx, bson.M{"userId": bson.M{"$in": doomedIDs}})
			log.Printf("[migrate-patient-care-team] dry-run would cleanup %s: %d", col, n)
		}
	}
	return nil
}

func pickSeedStaffToPrune(all []staffUser, role string, count int, skip bool) []staffUser {
	if skip || count <= 0 {
		return nil
	}
	type ranked struct {
		user staffUser
		num  int
	}
	var candidates []ranked
	for _, u := range all {
		if u.Email == "doctor@gmail.com" || u.Email == "nurse@gmail.com" {
			continue
		}
		m := seedStaffEmailRE.FindStringSubmatch(u.Email)
		if m == nil || m[1] != role {
			continue
		}
		n, _ := strconv.Atoi(m[2])
		candidates = append(candidates, ranked{user: u, num: n})
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].num > candidates[j].num })
	if count > len(candidates) {
		count = len(candidates)
	}
	out := make([]staffUser, 0, count)
	for i := 0; i < count; i++ {
		out = append(out, candidates[i].user)
	}
	return out
}

func filterKeepers(all []staffUser, doomed map[primitive.ObjectID]staffUser) []staffUser {
	out := make([]staffUser, 0, len(all))
	for _, u := range all {
		if _, ok := doomed[u.ID]; ok {
			continue
		}
		out = append(out, u)
	}
	return out
}

func indexStaff(all []staffUser) map[primitive.ObjectID]staffUser {
	out := make(map[primitive.ObjectID]staffUser, len(all))
	for _, u := range all {
		out[u.ID] = u
	}
	return out
}

func loadStaff(ctx context.Context, db *mongo.Database, role string) ([]staffUser, error) {
	cur, err := db.Collection("users").Find(ctx, bson.M{"role": role}, options.Find().SetProjection(bson.M{
		"_id": 1, "email": 1, "role": 1, "departmentId": 1, "specialization": 1,
	}))
	if err != nil {
		return nil, fmt.Errorf("load %s: %w", role, err)
	}
	defer cur.Close(ctx)
	var out []staffUser
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Email < out[j].Email })
	return out, nil
}

func loadPatients(ctx context.Context, db *mongo.Database) ([]patientUser, error) {
	cur, err := db.Collection("users").Find(ctx, bson.M{"role": string(userDomain.RolePatient)}, options.Find().SetProjection(bson.M{
		"_id": 1, "email": 1, "diseaseTypes": 1,
	}))
	if err != nil {
		return nil, fmt.Errorf("load patients: %w", err)
	}
	defer cur.Close(ctx)
	var out []patientUser
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func loadAssignments(ctx context.Context, db *mongo.Database) ([]assignmentDoc, error) {
	cur, err := db.Collection("assignments").Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("load assignments: %w", err)
	}
	defer cur.Close(ctx)
	var out []assignmentDoc
	if err := cur.All(ctx, &out); err != nil {
		return nil, err
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].PatientID.Hex() < out[j].PatientID.Hex()
	})
	return out, nil
}
