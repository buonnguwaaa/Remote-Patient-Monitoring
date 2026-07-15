package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Clinical absolute cutoffs (must match trend_evaluator.go).
const (
	clinicalSys = 160.0
	clinicalDia = 100.0
)

func watchLimit(personal, clinical float64) float64 {
	if personal <= 0 {
		return clinical
	}
	return math.Min(personal, clinical)
}

func main() {
	_ = godotenv.Load(".env")
	uri := os.Getenv("MONGO_URI")
	dbName := os.Getenv("MONGO_DB_NAME")
	if uri == "" || dbName == "" {
		log.Fatal("MONGO_URI / MONGO_DB_NAME required")
	}

	if len(os.Args) < 2 {
		log.Fatal("usage: go run ./script/main/seed_trend_measurement.go <patientId>")
	}
	patientID, err := primitive.ObjectIDFromHex(os.Args[1])
	if err != nil {
		log.Fatalf("invalid patientId %q: %v", os.Args[1], err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			log.Printf("mongo disconnect: %v", err)
		}
	}()

	db := client.Database(dbName)
	users := db.Collection("users")
	var user bson.M
	if err := users.FindOne(ctx, bson.M{"_id": patientID}).Decode(&user); err != nil {
		log.Fatalf("patient not found in %s.users: %v", dbName, err)
	}
	fmt.Printf("Found patient: %v %v\n", user["fullName"], user["email"])

	// Load personal threshold so seed stays below Watch until today's reading.
	var th struct {
		SysMax float64 `bson:"sysMax"`
		DiaMax float64 `bson:"diaMax"`
	}
	err = db.Collection("thresholds").FindOne(
		ctx,
		bson.M{"patientId": patientID},
		options.FindOne().SetSort(bson.D{{Key: "effectiveFrom", Value: -1}}),
	).Decode(&th)
	if err != nil {
		log.Fatalf("need a personal threshold for this patient: %v", err)
	}

	sysWatch := watchLimit(th.SysMax, clinicalSys)
	diaWatch := watchLimit(th.DiaMax, clinicalDia)
	fmt.Printf("Personal SysMax=%.0f DiaMax=%.0f → watchLimit sys=%.0f dia=%.0f\n",
		th.SysMax, th.DiaMax, sysWatch, diaWatch)

	col := db.Collection("measurements")
	note := "seed:trend-watch-prep"
	device := "seed-script"

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	// Yesterday must NOT meet Watch:
	//   - only 2 consecutive rises
	//   - value < 0.85 * watchLimit  (ProximityWatch)
	// Today must tip Watch: value >= 0.85 * watchLimit AND one more rise (3 consecutive).
	sysWatchGate := math.Floor(0.85*sysWatch) - 1 // strictly < 0.85*watchLimit
	diaWatchGate := math.Floor(0.85*diaWatch) - 1
	if sysWatchGate < 110 {
		sysWatchGate = 110
	}
	if diaWatchGate < 70 {
		diaWatchGate = 70
	}

	// Build 6 days ending at gate with a mid-window dip (breaks long consecutive run).
	sysSeries := []float64{
		sysWatchGate - 12,
		sysWatchGate - 12,
		sysWatchGate - 7,
		sysWatchGate - 8, // dip
		sysWatchGate - 4,
		sysWatchGate, // day -1: 2 consecutive rises only
	}
	diaSeries := []float64{
		diaWatchGate - 8,
		diaWatchGate - 8,
		diaWatchGate - 5,
		diaWatchGate - 6, // dip
		diaWatchGate - 3,
		diaWatchGate,
	}

	type row struct {
		daysAgo  int
		hour     int
		sys, dia float64
	}
	rows := make([]row, 0, 6)
	for i := 0; i < 6; i++ {
		rows = append(rows, row{
			daysAgo: 6 - i,
			hour:    9,
			sys:     sysSeries[i],
			dia:     diaSeries[i],
		})
	}

	todaySys := math.Max(math.Ceil(0.85*sysWatch), sysWatchGate+4)
	todayDia := math.Max(math.Ceil(0.85*diaWatch), diaWatchGate+4)

	docs := make([]interface{}, 0, len(rows))
	for _, r := range rows {
		at := today.AddDate(0, 0, -r.daysAgo).Add(time.Duration(r.hour) * time.Hour)
		sys, dia := r.sys, r.dia
		n := note
		d := device
		docs = append(docs, bson.M{
			"patientId": patientID,
			"bloodPressure": bson.M{
				"systolic":  sys,
				"diastolic": dia,
			},
			"device":    d,
			"note":      n,
			"createdAt": at,
			"updatedAt": at,
		})
	}

	// Clean: prior seed rows + any measurements from today (failed test posts),
	// plus trend alerts tied to those so retests stay clear.
	delSeed, err := col.DeleteMany(ctx, bson.M{"patientId": patientID, "note": note})
	if err != nil {
		log.Fatal(err)
	}
	delToday, err := col.DeleteMany(ctx, bson.M{
		"patientId": patientID,
		"createdAt": bson.M{"$gte": today},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Removed %d seed + %d today measurements\n", delSeed.DeletedCount, delToday.DeletedCount)

	alertDel, err := db.Collection("alerts").DeleteMany(ctx, bson.M{
		"patientId": patientID,
		"createdAt": bson.M{"$gte": today},
		"violations.rule": bson.M{"$in": []string{
			"trend_rising_watch", "trend_rising_high",
			"trend_falling_watch", "trend_falling_high",
		}},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Removed %d today trend alerts\n", alertDel.DeletedCount)

	res, err := col.InsertMany(ctx, docs)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Inserted %d measurements:\n", len(res.InsertedIDs))
	for i, r := range rows {
		at := today.AddDate(0, 0, -r.daysAgo).Add(time.Duration(r.hour) * time.Hour)
		fmt.Printf("  -%dd %s  sys=%.0f dia=%.0f  id=%v\n", r.daysAgo, at.Format(time.RFC3339), r.sys, r.dia, res.InsertedIDs[i])
	}
	fmt.Println()
	fmt.Println("Create ONE measurement TODAY via API (keep rising — do not go lower than yesterday):")
	fmt.Printf("  bloodPressure.systolic  >= %.0f\n", todaySys)
	fmt.Printf("  bloodPressure.diastolic >= %.0f\n", todayDia)
	fmt.Printf("Example: {\"patientId\":\"%s\",\"bloodPressure\":{\"systolic\":%.0f,\"diastolic\":%.0f}}\n",
		patientID.Hex(), todaySys, todayDia)
	fmt.Println("Notes:")
	fmt.Println("  - Restart Temporal worker after trend_evaluator changes.")
	fmt.Println("  - A second lower reading (e.g. 138 then 137) breaks ConsecutiveRising and clears the trend.")
}
