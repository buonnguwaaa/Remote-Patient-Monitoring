package users

import (
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
	ID           string    `json:"id" bson:"_id"`
	Role         Role      `json:"role" bson:"role"`
	Name         string    `json:"name" bson:"name"`
	EmailLower   string    `json:"emailLower" bson:"emailLower"`
	PasswordHash string    `json:"passwordHash" bson:"passwordHash"`
	Gender       Gender    `json:"gender,omitempty" bson:"gender,omitempty"`
	Dob          time.Time `json:"dob,omitempty" bson:"dob,omitempty"`
	CreatedAt    time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt" bson:"updatedAt"`
}

type UserRepository interface {
	// Define methods for user data access here
}

type UserService interface {
	// Define methods for user business logic here
}
