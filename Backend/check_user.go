package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		log.Fatal("Error loading .env file")
	}

	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		log.Fatal("MONGO_URI not set")
	}

	client, err := mongo.Connect(context.TODO(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.TODO())

	db := client.Database("rpm")
	usersCol := db.Collection("users")

	var user bson.M
	err = usersCol.FindOne(context.TODO(), bson.M{"email": "doctor@gmail.com"}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("User doctor@gmail.com not found!")
		} else {
			log.Fatal(err)
		}
		return
	}

	fmt.Printf("User found: %v\n", user["email"])
	fmt.Printf("Role: %v\n", user["role"])
	fmt.Printf("Password hash exists: %v\n", user["password"] != nil)
}
