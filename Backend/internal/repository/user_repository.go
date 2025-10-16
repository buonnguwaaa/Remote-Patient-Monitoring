package repository

import (
	"context"
	"RPM-Backend/internal/api/model"
	"RPM-Backend/internal/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const userCollection = "users"

func getCollection() *mongo.Collection {
	return config.Client().Database("rpm").Collection(userCollection)
}

func CreateUser(ctx context.Context, user *model.User) error {
	_, err := getCollection().InsertOne(ctx, user)
	return err
}

func FindUserByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := getCollection().FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func FindUserByID(ctx context.Context, id primitive.ObjectID) (*model.User, error) {
	var user model.User
	err := getCollection().FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
