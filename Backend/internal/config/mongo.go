package config

import (
	"context"
	"errors"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"os"
	"time"
)

var client *mongo.Client

func Connect() error {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		return errors.New("MONGO_URI environment variable not set")
	}
	var err error
	client, err = mongo.NewClient(options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = client.Connect(ctx)
	if err != nil {
		return err
	}

	return nil
}

func Client() *mongo.Client {
    return client
}

// Lấy database từ client toàn cục
func Database() *mongo.Database {
	return client.Database("rpm")
}

