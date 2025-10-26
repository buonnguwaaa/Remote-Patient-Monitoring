package repositories

import (
	"context"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const userCollection = "users"

func getCollection() *mongo.Collection {
	return config.Mongo.Database.Collection(userCollection)
}

func CreateUser(ctx context.Context, user *users.User) error {
	_, err := getCollection().InsertOne(ctx, user)
	return err
}

func FindUserByEmail(ctx context.Context, email string) (*users.User, error) {
	var user users.User
	err := getCollection().FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func FindUserByID(ctx context.Context, id primitive.ObjectID) (*users.User, error) {
	var user users.User
	err := getCollection().FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
