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

// Deletes duplicate-named patients, keeping one survivor per name, and
// cascades related clinical/auth documents for the removed patient IDs.
//
// Keep priority (highest first):
//  1. patient@gmail.com
//  2. non-seed emails
//  3. original seed-patient-02..50 over append seed-patient-1xxx
//  4. older createdAt
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_dedupe_patient_names --dry-run
//	go run ./migration/cmd/migrate_dedupe_patient_names
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-dedupe-patient-names] no .env file found, using environment variables")
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-dedupe-patient-names] connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-dedupe-patient-names] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if err := run(ctx, config.Mongo.Database, dryRun); err != nil {
		log.Fatalf("[migrate-dedupe-patient-names] failed: %v", err)
	}
}

type patientRow struct {
	ID        primitive.ObjectID `bson:"_id"`
	Email     string             `bson:"email"`
	Name      string             `bson:"name"`
	CreatedAt time.Time          `bson:"createdAt"`
}

var seedPatientEmailRE = regexp.MustCompile(`^seed-patient-(\d+)@rpm\.local$`)

func run(ctx context.Context, db *mongo.Database, dryRun bool) error {
	mode := "APPLY"
	if dryRun {
		mode = "DRY-RUN"
	}
	log.Printf("[migrate-dedupe-patient-names] mode=%s db=%s", mode, db.Name())

	cur, err := db.Collection("users").Find(ctx, bson.M{"role": string(userDomain.RolePatient)}, options.Find().SetProjection(bson.M{
		"_id": 1, "email": 1, "name": 1, "createdAt": 1,
	}))
	if err != nil {
		return err
	}
	defer func() { _ = cur.Close(ctx) }()

	var patients []patientRow
	if err := cur.All(ctx, &patients); err != nil {
		return err
	}

	byName := map[string][]patientRow{}
	for _, p := range patients {
		name := strings.TrimSpace(p.Name)
		if name == "" {
			continue
		}
		byName[name] = append(byName[name], p)
	}

	var toDelete []patientRow
	groups := 0
	for name, group := range byName {
		if len(group) < 2 {
			continue
		}
		groups++
		sort.SliceStable(group, func(i, j int) bool {
			return keepRank(group[i]) < keepRank(group[j])
		})
		keeper := group[0]
		log.Printf("[migrate-dedupe-patient-names] name=%q keep=%s delete=%v",
			name, keeper.Email, emailsOf(group[1:]))
		toDelete = append(toDelete, group[1:]...)
	}

	sort.Slice(toDelete, func(i, j int) bool { return toDelete[i].Email < toDelete[j].Email })
	log.Printf("[migrate-dedupe-patient-names] duplicate groups=%d patients to delete=%d", groups, len(toDelete))

	deletedUsers := 0
	totals := map[string]int{}
	for _, p := range toDelete {
		counts, err := cascadeDeletePatient(ctx, db, p, dryRun)
		if err != nil {
			return fmt.Errorf("delete %s: %w", p.Email, err)
		}
		for k, v := range counts {
			totals[k] += v
		}
		deletedUsers++
		log.Printf("[migrate-dedupe-patient-names] removed %s (%s) related=%v", p.Email, p.ID.Hex(), counts)
	}

	log.Printf("[migrate-dedupe-patient-names] done: deletedPatients=%d relatedTotals=%v", deletedUsers, totals)
	if dryRun {
		log.Printf("[migrate-dedupe-patient-names] dry-run only; re-run without --dry-run to apply")
	}
	return nil
}

// keepRank: lower = more preferred to keep.
func keepRank(p patientRow) int {
	email := strings.ToLower(strings.TrimSpace(p.Email))
	if email == "patient@gmail.com" {
		return 0
	}
	if m := seedPatientEmailRE.FindStringSubmatch(email); m != nil {
		n, _ := strconv.Atoi(m[1])
		// Original seed (02-50) before append (1000+)
		if n >= 1000 {
			return 300000 + n
		}
		return 200000 + n
	}
	// Real / non-seed accounts beat seed duplicates.
	// Prefer older createdAt via secondary sort key encoded in rank.
	sec := int(p.CreatedAt.Unix() % 100000)
	if p.CreatedAt.IsZero() {
		sec = 99999
	}
	return 100000 + sec
}

func emailsOf(rows []patientRow) []string {
	out := make([]string, len(rows))
	for i, r := range rows {
		out[i] = r.Email
	}
	return out
}

func cascadeDeletePatient(ctx context.Context, db *mongo.Database, p patientRow, dryRun bool) (map[string]int, error) {
	id := p.ID
	counts := map[string]int{}

	// Conversations involving the patient (+ their messages).
	convCur, err := db.Collection("conversations").Find(ctx, bson.M{
		"participants.userId": id,
	}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, fmt.Errorf("find conversations: %w", err)
	}
	var convIDs []primitive.ObjectID
	for convCur.Next(ctx) {
		var c bson.M
		if err := convCur.Decode(&c); err != nil {
			_ = convCur.Close(ctx)
			return nil, err
		}
		convIDs = append(convIDs, c["_id"].(primitive.ObjectID))
	}
	_ = convCur.Close(ctx)

	if len(convIDs) > 0 {
		if dryRun {
			n, _ := db.Collection("messages").CountDocuments(ctx, bson.M{"conversationId": bson.M{"$in": convIDs}})
			counts["messages"] = int(n)
			counts["conversations"] = len(convIDs)
		} else {
			res, err := db.Collection("messages").DeleteMany(ctx, bson.M{"conversationId": bson.M{"$in": convIDs}})
			if err != nil {
				return nil, fmt.Errorf("messages: %w", err)
			}
			counts["messages"] = int(res.DeletedCount)
			res, err = db.Collection("conversations").DeleteMany(ctx, bson.M{"_id": bson.M{"$in": convIDs}})
			if err != nil {
				return nil, fmt.Errorf("conversations: %w", err)
			}
			counts["conversations"] = int(res.DeletedCount)
		}
	}

	type delSpec struct {
		col    string
		filter bson.M
	}
	specs := []delSpec{
		{"assignments", bson.M{"patientId": id}},
		{"thresholds", bson.M{"patientId": id}},
		{"measurements", bson.M{"patientId": id}},
		{"alerts", bson.M{"patientId": id}},
		{"prescriptions", bson.M{"patientId": id}},
		{"medication_intakes", bson.M{"patientId": id}},
		{"reminders", bson.M{"patientId": id}},
		{"follow_up_appointments", bson.M{"patientId": id}},
		{"video_sessions", bson.M{"patientId": id}},
		{"activity_logs", bson.M{"$or": []bson.M{{"patientId": id}, {"userId": id}}}},
		{"notifications", bson.M{"userId": id}},
		{"notification_tokens", bson.M{"userId": id}},
		{"refresh_tokens", bson.M{"userId": id}},
	}

	for _, s := range specs {
		if dryRun {
			n, err := db.Collection(s.col).CountDocuments(ctx, s.filter)
			if err != nil {
				return nil, fmt.Errorf("count %s: %w", s.col, err)
			}
			if n > 0 {
				counts[s.col] = int(n)
			}
			continue
		}
		res, err := db.Collection(s.col).DeleteMany(ctx, s.filter)
		if err != nil {
			return nil, fmt.Errorf("delete %s: %w", s.col, err)
		}
		if res.DeletedCount > 0 {
			counts[s.col] = int(res.DeletedCount)
		}
	}

	if dryRun {
		counts["users"] = 1
		return counts, nil
	}
	res, err := db.Collection("users").DeleteOne(ctx, bson.M{
		"_id":  id,
		"role": string(userDomain.RolePatient),
	})
	if err != nil {
		return nil, fmt.Errorf("users: %w", err)
	}
	counts["users"] = int(res.DeletedCount)
	if res.DeletedCount != 1 {
		return nil, fmt.Errorf("expected to delete user %s, deleted=%d", p.Email, res.DeletedCount)
	}
	return counts, nil
}
