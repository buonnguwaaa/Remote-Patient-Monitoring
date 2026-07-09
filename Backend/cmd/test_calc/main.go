package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/reminder_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	mongoURI := os.Getenv("MONGO_URI")
	dbName := os.Getenv("MONGO_DB_NAME")
	if mongoURI == "" || dbName == "" {
		log.Fatal("MONGO_URI or MONGO_DB_NAME not set")
	}

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(context.Background())

	db := client.Database(dbName)

	patientID, _ := primitive.ObjectIDFromHex("6a4da9b4fd9c507639971c54")

	curR, err := db.Collection("reminders").Find(context.Background(), bson.M{
		"patientId": patientID,
		"message":   bson.M{"$regex": "Losartan"},
	})
	if err != nil {
		log.Fatal(err)
	}
	defer curR.Close(context.Background())

	for curR.Next(context.Background()) {
		var r domain.Reminder
		if err := curR.Decode(&r); err != nil {
			log.Fatal(err)
		}

		now := time.Now().UTC()
		nextTime, ok := reminder_helper.CalculateNextReminderTime(now, &r)
		fmt.Printf("Reminder ID: %s\n", r.ID.Hex())
		fmt.Printf("  Message: %s\n", r.Message)
		fmt.Printf("  StartDate: %v (UTC), Local: %v\n", r.StartDate, r.StartDate.Local())
		fmt.Printf("  EndDate: %v (UTC), Local: %v\n", r.EndDate, r.EndDate.Local())
		fmt.Printf("  Now: %v (UTC)\n", now)
		fmt.Printf("  CalculateNextReminderTime result: ok=%t, nextTime=%v (UTC)\n", ok, nextTime)
	}
}
