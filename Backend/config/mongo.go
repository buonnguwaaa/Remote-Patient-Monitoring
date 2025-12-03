package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoInstance struct {
	Client   *mongo.Client
	Database *mongo.Database
}

var Mongo MongoInstance

func ConnectMongo() error {
	uri := os.Getenv("MONGO_URI")
	dbName := os.Getenv("MONGO_DB_NAME")

	if uri == "" || dbName == "" {
		return fmt.Errorf("MONGO_URI or MONGO_DB_NAME environment variable is not set")
	}

	clientOptions := options.Client().ApplyURI(uri).SetServerSelectionTimeout(5 * time.Second)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %v", err)
	}

	err = client.Ping(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("failed to ping MongoDB: %v", err)
	}

	Mongo = MongoInstance{
		Client:   client,
		Database: client.Database(dbName),
	}

	log.Println("[GIN-info] Connected to MongoDB!")
	return nil
}

func DisconnectMongo() error {
	if Mongo.Client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := Mongo.Client.Disconnect(ctx); err != nil {
			return err
		}
	}

	log.Println("[GIN-info] Disconnected from MongoDB")
	return nil
}
