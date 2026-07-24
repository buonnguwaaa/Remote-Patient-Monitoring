// Temporary one-off: round all float vital fields on existing measurements to
// 1 decimal place, then align related alert violation.observed / threshold.
// Does NOT create or delete any documents.
//
//	cd Backend && go run ./migration/cmd/tmp_round_bp
package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

func asFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int32:
		return float64(n), true
	case int64:
		return float64(n), true
	case int:
		return float64(n), true
	default:
		return 0, false
	}
}

// takeRounded returns round1(raw). If the stored value differs, it writes path into set.
func takeRounded(set bson.M, path string, raw interface{}) (rounded float64, ok bool) {
	v, ok := asFloat(raw)
	if !ok {
		return 0, false
	}
	r := round1(v)
	if r != v {
		set[path] = r
	}
	return r, true
}

type snap struct {
	id   primitive.ObjectID
	vals map[string]float64 // alert violation type → rounded observed
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("[tmp_round_bp] no .env file found, using environment variables")
	}
	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[tmp_round_bp] mongo connect: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[tmp_round_bp] disconnect: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Minute)
	defer cancel()

	db := config.Mongo.Database
	msCol := db.Collection("measurements")
	alertCol := db.Collection("alerts")

	cur, err := msCol.Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{
		"_id":             1,
		"temperature":     1,
		"heartRate":       1,
		"respiratoryRate": 1,
		"spo2":            1,
		"bloodPressure":   1,
		"glucose":         1,
		"height":          1,
		"weight":          1,
		"bmi":             1,
	}))
	if err != nil {
		log.Fatalf("[tmp_round_bp] find measurements: %v", err)
	}
	defer func() { _ = cur.Close(ctx) }()

	var snapshots []snap
	msUpdated := 0

	for cur.Next(ctx) {
		var doc bson.M
		if err := cur.Decode(&doc); err != nil {
			log.Fatalf("[tmp_round_bp] decode measurement: %v", err)
		}
		id, ok := doc["_id"].(primitive.ObjectID)
		if !ok {
			continue
		}

		set := bson.M{}
		s := snap{id: id, vals: map[string]float64{}}

		if v, ok := takeRounded(set, "temperature", doc["temperature"]); ok {
			s.vals["temperature"] = v
		}
		if v, ok := takeRounded(set, "heartRate", doc["heartRate"]); ok {
			s.vals["heart_rate"] = v
		}
		if v, ok := takeRounded(set, "respiratoryRate", doc["respiratoryRate"]); ok {
			s.vals["respiratory_rate"] = v
		}
		if v, ok := takeRounded(set, "spo2", doc["spo2"]); ok {
			s.vals["spo2"] = v
		}
		_, _ = takeRounded(set, "height", doc["height"])
		_, _ = takeRounded(set, "weight", doc["weight"])
		_, _ = takeRounded(set, "bmi", doc["bmi"])

		if bp, _ := doc["bloodPressure"].(bson.M); bp != nil {
			sys, hasSys := takeRounded(set, "bloodPressure.systolic", bp["systolic"])
			dia, hasDia := takeRounded(set, "bloodPressure.diastolic", bp["diastolic"])
			if hasSys {
				s.vals["blood_pressure_systolic"] = sys
			}
			if hasDia {
				s.vals["blood_pressure_diastolic"] = dia
			}
			mapRaw, hasMap := asFloat(bp["map"])
			if hasSys && hasDia {
				mp := round1((sys + 2*dia) / 3)
				if !hasMap || mp != mapRaw {
					set["bloodPressure.map"] = mp
				}
			} else if hasMap {
				mp := round1(mapRaw)
				if mp != mapRaw {
					set["bloodPressure.map"] = mp
				}
			}
		}

		if g, _ := doc["glucose"].(bson.M); g != nil {
			if v, ok := takeRounded(set, "glucose.bloodGlucose", g["bloodGlucose"]); ok {
				s.vals["glucose"] = v
			}
		}

		if len(set) > 0 {
			if _, err := msCol.UpdateByID(ctx, id, bson.M{"$set": set}); err != nil {
				log.Fatalf("[tmp_round_bp] update measurement %s: %v", id.Hex(), err)
			}
			msUpdated++
		}
		if len(s.vals) > 0 {
			snapshots = append(snapshots, s)
		}
	}
	if err := cur.Err(); err != nil {
		log.Fatalf("[tmp_round_bp] measurement cursor: %v", err)
	}

	alertsUpdated := 0
	violationsPatched := 0
	alignTypes := map[string]bool{
		"temperature":              true,
		"heart_rate":               true,
		"respiratory_rate":         true,
		"spo2":                     true,
		"blood_pressure_systolic":  true,
		"blood_pressure_diastolic": true,
		"glucose":                  true,
	}

	for _, s := range snapshots {
		acur, err := alertCol.Find(ctx, bson.M{"measurementId": s.id})
		if err != nil {
			log.Fatalf("[tmp_round_bp] find alerts for %s: %v", s.id.Hex(), err)
		}

		for acur.Next(ctx) {
			var alert bson.M
			if err := acur.Decode(&alert); err != nil {
				_ = acur.Close(ctx)
				log.Fatalf("[tmp_round_bp] decode alert: %v", err)
			}
			alertID, ok := alert["_id"].(primitive.ObjectID)
			if !ok {
				continue
			}
			rawViolations, ok := alert["violations"].(bson.A)
			if !ok || len(rawViolations) == 0 {
				continue
			}

			patched := false
			newViolations := make(bson.A, 0, len(rawViolations))
			for _, raw := range rawViolations {
				v, ok := raw.(bson.M)
				if !ok {
					newViolations = append(newViolations, raw)
					continue
				}

				vType, _ := v["type"].(string)
				if alignTypes[vType] {
					if want, ok := s.vals[vType]; ok {
						obs, hasObs := asFloat(v["observed"])
						if !hasObs || obs != want {
							v["observed"] = want
							patched = true
							violationsPatched++
						}
					}
					if th, ok := asFloat(v["threshold"]); ok {
						rth := round1(th)
						if rth != th {
							v["threshold"] = rth
							patched = true
						}
					}
				}
				newViolations = append(newViolations, v)
			}

			if !patched {
				continue
			}
			if _, err := alertCol.UpdateByID(ctx, alertID, bson.M{
				"$set": bson.M{
					"violations": newViolations,
					"updatedAt":  time.Now().UTC(),
				},
			}); err != nil {
				_ = acur.Close(ctx)
				log.Fatalf("[tmp_round_bp] update alert %s: %v", alertID.Hex(), err)
			}
			alertsUpdated++
		}
		if err := acur.Err(); err != nil {
			_ = acur.Close(ctx)
			log.Fatalf("[tmp_round_bp] alert cursor: %v", err)
		}
		_ = acur.Close(ctx)
	}

	fmt.Printf("[tmp_round_bp] done (update-only, no creates/deletes)\n")
	fmt.Printf("  measurements updated: %d\n", msUpdated)
	fmt.Printf("  measurements scanned for alert align: %d\n", len(snapshots))
	fmt.Printf("  alerts updated: %d\n", alertsUpdated)
	fmt.Printf("  alert violations patched: %d\n", violationsPatched)
}
