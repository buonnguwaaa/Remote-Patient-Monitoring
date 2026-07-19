package main

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI("mongodb+srv://anhkhoa06052004_db_user:vjE0XstopOlf4oJWh@rpm-cluster.ksihm1l.mongodb.net/rpm_prod?retryWrites=true&w=majority&appName=rpm-cluster"))
	if err != nil { panic(err) }
	defer client.Disconnect(context.TODO())

	col := client.Database("rpm_prod").Collection("thresholds")
	
	now := time.Now().UTC()
	pid, _ := primitive.ObjectIDFromHex("6a4e294ec7176c806e000362")
	
	query := bson.M{}
	query["patientId"] = pid
	query["effectiveFrom"] = bson.M{"$lte": now}
	query["$or"] = []bson.M{
		{"effectiveTo": bson.M{"$exists": false}},
		{"effectiveTo": nil},
		{"effectiveTo": bson.M{"$gt": now}},
	}

	opts := options.FindOne().SetSort(bson.D{{Key: "effectiveFrom", Value: -1}})

	var result bson.M
	err = col.FindOne(context.TODO(), query, opts).Decode(&result)
	
	if err != nil {
		fmt.Printf("ERROR: %v\n", err)
	} else {
		fmt.Printf("FOUND: %+v\n", result)
	}
}
