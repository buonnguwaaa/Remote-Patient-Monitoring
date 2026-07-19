package main

import (
	"context"
	"fmt"
	

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI("mongodb+srv://anhkhoa06052004_db_user:vjE0XstopOlf4oJWh@rpm-cluster.ksihm1l.mongodb.net/rpm_prod?retryWrites=true&w=majority&appName=rpm-cluster"))
	if err != nil {
		panic(err)
	}
	defer client.Disconnect(context.TODO())

	col := client.Database("rpm").Collection("thresholds")
	cursor, err := col.Find(context.TODO(), bson.M{})
	if err != nil {
		panic(err)
	}

	var results []bson.M
	if err = cursor.All(context.TODO(), &results); err != nil {
		panic(err)
	}

	for _, r := range results {
		fmt.Printf("ID: %v\n", r["_id"])
		fmt.Printf("PatientID: %v\n", r["patientId"])
		fmt.Printf("EffectiveFrom: %v (type: %T)\n", r["effectiveFrom"], r["effectiveFrom"])
		fmt.Printf("EffectiveTo: %v (type: %T)\n", r["effectiveTo"], r["effectiveTo"])
		fmt.Printf("CreatedAt: %v\n", r["createdAt"])
		fmt.Println("---")
	}
}
