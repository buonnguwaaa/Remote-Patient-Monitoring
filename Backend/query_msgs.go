package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	if err := config.ConnectMongo(); err != nil {
		log.Fatal(err)
	}
	defer config.DisconnectMongo()

	col := config.MongoClient.Database(config.MongoDBName).Collection("messages")
	
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(10)
	cursor, err := col.Find(context.Background(), bson.M{}, opts)
	if err != nil {
		log.Fatal(err)
	}

	var results []bson.M
	if err = cursor.All(context.Background(), &results); err != nil {
		log.Fatal(err)
	}

	for _, res := range results {
		fmt.Printf("Message: source=%v, senderId=%v, content=%v, relatedAlertId=%v\n", res["messageSource"], res["senderId"], res["content"], res["relatedAlertId"])
	}
}
