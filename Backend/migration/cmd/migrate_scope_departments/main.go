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
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/migration/seed"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Narrows existing MongoDB data to hypertension / diabetes departments only:
//   - Khoa Tim mạch
//   - Khoa Nội Tổng quát  (renames "Khoa Nội Tổng hợp" if present)
//   - Khoa Thận - Tiết niệu
//   - Khoa Nội tiết
//
// Reassigns doctors/nurses off deleted departments, aligns doctor
// specialization with the assigned department, then deletes other departments.
// Does NOT drop the database.
//
// Usage (from Backend/):
//
//	go run ./migration/cmd/migrate_scope_departments --dry-run
//	go run ./migration/cmd/migrate_scope_departments
func main() {
	dryRun := false
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" {
			dryRun = true
		}
	}

	if err := godotenv.Load(); err != nil {
		log.Println("[migrate-scope-departments] no .env file found, using environment variables")
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[migrate-scope-departments] could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[migrate-scope-departments] disconnect error: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := run(ctx, config.Mongo.Database, dryRun); err != nil {
		log.Fatalf("[migrate-scope-departments] failed: %v", err)
	}
}

func run(ctx context.Context, db *mongo.Database, dryRun bool) error {
	keepNames := seed.DepartmentNames()
	deptsCol := db.Collection("departments")
	usersCol := db.Collection("users")
	now := time.Now().UTC()

	mode := "APPLY"
	if dryRun {
		mode = "DRY-RUN"
	}
	log.Printf("[migrate-scope-departments] mode=%s db=%s keep=%v", mode, db.Name(), keepNames)

	cur, err := deptsCol.Find(ctx, bson.M{})
	if err != nil {
		return fmt.Errorf("list departments: %w", err)
	}
	var all []bson.M
	if err := cur.All(ctx, &all); err != nil {
		return fmt.Errorf("decode departments: %w", err)
	}

	byID := make(map[primitive.ObjectID]string, len(all))
	byName := make(map[string]primitive.ObjectID, len(all))
	for _, d := range all {
		id := d["_id"].(primitive.ObjectID)
		name, _ := d["name"].(string)
		byID[id] = name
		byName[name] = id
	}

	const legacyGeneral = "Khoa Nội Tổng hợp"
	const targetGeneral = "Khoa Nội Tổng quát"
	if id, ok := byName[legacyGeneral]; ok {
		log.Printf("[migrate-scope-departments] rename %q -> %q (%s)", legacyGeneral, targetGeneral, id.Hex())
		if !dryRun {
			if _, err := deptsCol.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
				"$set": bson.M{"name": targetGeneral, "updatedAt": now},
			}); err != nil {
				return fmt.Errorf("rename department: %w", err)
			}
		}
		byID[id] = targetGeneral
		delete(byName, legacyGeneral)
		byName[targetGeneral] = id
	}

	keepIDByName := make(map[string]primitive.ObjectID, len(keepNames))
	keepSet := make(map[primitive.ObjectID]string, len(keepNames))
	for _, name := range keepNames {
		if id, ok := byName[name]; ok {
			keepIDByName[name] = id
			keepSet[id] = name
			log.Printf("[migrate-scope-departments] keep %q (%s)", name, id.Hex())
			continue
		}
		id := primitive.NewObjectID()
		log.Printf("[migrate-scope-departments] create missing %q (%s)", name, id.Hex())
		if !dryRun {
			doc := bson.M{
				"_id":         id,
				"name":        name,
				"description": fmt.Sprintf("%s trực thuộc hệ thống theo dõi bệnh nhân từ xa", name),
				"createdAt":   now,
				"updatedAt":   now,
			}
			if _, err := deptsCol.InsertOne(ctx, doc); err != nil {
				return fmt.Errorf("create department %q: %w", name, err)
			}
		}
		keepIDByName[name] = id
		keepSet[id] = name
		byID[id] = name
		byName[name] = id
	}

	specToDept := map[string]string{
		"Tim mạch":         "Khoa Tim mạch",
		"Nội Tổng quát":    "Khoa Nội Tổng quát",
		"Nội Tổng hợp":     "Khoa Nội Tổng quát",
		"Thận - Tiết niệu": "Khoa Thận - Tiết niệu",
		"Nội tiết":         "Khoa Nội tiết",
	}

	staffCur, err := usersCol.Find(ctx, bson.M{
		"role": bson.M{"$in": []string{string(userDomain.RoleDoctor), string(userDomain.RoleNurse)}},
	}, options.Find().SetProjection(bson.M{
		"_id":            1,
		"role":           1,
		"email":          1,
		"departmentId":   1,
		"specialization": 1,
	}))
	if err != nil {
		return fmt.Errorf("list staff: %w", err)
	}
	var staff []bson.M
	if err := staffCur.All(ctx, &staff); err != nil {
		return fmt.Errorf("decode staff: %w", err)
	}
	sort.Slice(staff, func(i, j int) bool {
		return fmt.Sprint(staff[i]["_id"]) < fmt.Sprint(staff[j]["_id"])
	})

	rr := 0
	reassigned, specUpdated := 0, 0
	for _, u := range staff {
		uid := u["_id"].(primitive.ObjectID)
		role, _ := u["role"].(string)
		email, _ := u["email"].(string)

		var currentDeptID primitive.ObjectID
		if v, ok := u["departmentId"].(primitive.ObjectID); ok {
			currentDeptID = v
		}

		targetName, alreadyKeep := keepSet[currentDeptID]
		if !alreadyKeep {
			if role == string(userDomain.RoleDoctor) {
				if spec, ok := u["specialization"].(string); ok {
					if pref, ok := specToDept[spec]; ok {
						targetName = pref
					}
				}
			}
			if targetName == "" {
				targetName = keepNames[rr%len(keepNames)]
				rr++
			}
			targetID := keepIDByName[targetName]
			log.Printf("[migrate-scope-departments] reassign %s %s -> %s", role, email, targetName)
			if !dryRun {
				if _, err := usersCol.UpdateOne(ctx, bson.M{"_id": uid}, bson.M{
					"$set": bson.M{"departmentId": targetID, "updatedAt": now},
				}); err != nil {
					return fmt.Errorf("reassign %s: %w", email, err)
				}
			}
			currentDeptID = targetID
			reassigned++
		}

		targetName = keepSet[currentDeptID]
		if targetName == "" {
			targetName = keepNames[0]
		}

		if role != string(userDomain.RoleDoctor) {
			continue
		}
		wantSpec := strings.TrimPrefix(targetName, "Khoa ")
		curSpec, _ := u["specialization"].(string)
		if curSpec == wantSpec {
			continue
		}
		log.Printf("[migrate-scope-departments] specialization %s: %q -> %q", email, curSpec, wantSpec)
		if !dryRun {
			if _, err := usersCol.UpdateOne(ctx, bson.M{"_id": uid}, bson.M{
				"$set": bson.M{"specialization": wantSpec, "updatedAt": now},
			}); err != nil {
				return fmt.Errorf("update specialization %s: %w", email, err)
			}
		}
		specUpdated++
	}

	toDelete := make([]primitive.ObjectID, 0)
	for id, name := range byID {
		if _, ok := keepSet[id]; ok {
			continue
		}
		toDelete = append(toDelete, id)
		log.Printf("[migrate-scope-departments] delete department %q (%s)", name, id.Hex())
	}

	deleted := 0
	if len(toDelete) > 0 {
		if dryRun {
			deleted = len(toDelete)
		} else {
			res, err := deptsCol.DeleteMany(ctx, bson.M{"_id": bson.M{"$in": toDelete}})
			if err != nil {
				return fmt.Errorf("delete departments: %w", err)
			}
			deleted = int(res.DeletedCount)
		}
	}

	log.Printf("[migrate-scope-departments] done: reassigned=%d specializationUpdated=%d departmentsDeleted=%d",
		reassigned, specUpdated, deleted)
	if dryRun {
		log.Printf("[migrate-scope-departments] dry-run only; re-run without --dry-run to apply")
	}
	return nil
}
