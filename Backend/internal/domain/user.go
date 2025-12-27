package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Role string

const (
	RolePatient Role = "user.patient"
	RoleDoctor  Role = "user.doctor"
	RoleNurse   Role = "user.nurse"
	RoleAdmin   Role = "admin"
)

type Gender string

const (
	GenderMale   Gender = "M"
	GenderFemale Gender = "F"
	GenderOther  Gender = "O"
)

type User struct {
	ID                    primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Role                  Role               `json:"role" bson:"role"`
	Name                  string             `json:"name" bson:"name"`
	Email                 string             `json:"email" bson:"email"`
	Password              string             `json:"password,omitempty" bson:"password,omitempty"`
	Provider              string             `json:"provider,omitempty" bson:"provider,omitempty"`
	Gender                Gender             `json:"gender,omitempty" bson:"gender,omitempty"`
	Dob                   time.Time          `json:"dob,omitempty" bson:"dob,omitempty"`
	DepartmentID          primitive.ObjectID `json:"departmentId,omitempty" bson:"departmentId,omitempty"`
	IsActive              bool               `json:"isActive" bson:"isActive"`
	ResetToken            string             `json:"resetToken,omitempty" bson:"resetToken,omitempty"`
	ResetTokenExpiry      time.Time          `json:"resetTokenExpiry,omitempty" bson:"resetTokenExpiry,omitempty"`
	ActivationTokenHash   string             `json:"activationTokenHash,omitempty" bson:"activationTokenHash,omitempty"`
	ActivationTokenExpiry time.Time          `json:"activationTokenExpiry,omitempty" bson:"activationTokenExpiry,omitempty"`
	CreatedAt             time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt             time.Time          `json:"updatedAt" bson:"updatedAt"`
}
