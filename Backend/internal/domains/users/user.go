package users

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Role string

const (
	RolePatient Role = "patient"
	RoleDoctor  Role = "doctor"
)

type Gender string

const (
	GenderMale   Gender = "M"
	GenderFemale Gender = "F"
	GenderOther  Gender = "O"
)

type User struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Role      Role               `json:"role" bson:"role"`
	Name      string             `json:"name" bson:"name"`
	Email     string             `json:"email" bson:"email"`
	Password  string             `json:"password,omitempty" bson:"password,omitempty"`
	Provider  string             `json:"provider,omitempty" bson:"provider,omitempty"`
	Gender    Gender             `json:"gender,omitempty" bson:"gender,omitempty"`
	Dob       time.Time          `json:"dob,omitempty" bson:"dob,omitempty"`
	IsActive     bool      `json:"isActive" bson:"isActive"`
	ResetToken   string    `json:"resetToken,omitempty" bson:"resetToken,omitempty"`
	ResetExpires time.Time `json:"resetExpires,omitempty" bson:"resetExpires,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt"`
}
