package model

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Role     string             `bson:"role" json:"role"`         // "patient" hoặc "doctor"
	Name     string             `bson:"name" json:"name"`
	Email    string             `bson:"email" json:"email"`
	Password string             `bson:"password" json:"-"`         // Không trả về password khi trả về JSON
	Gender   string             `bson:"gender" json:"gender"`
	Age      int                `bson:"age" json:"age"`
}
