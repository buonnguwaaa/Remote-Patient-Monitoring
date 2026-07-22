package user

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

type Status string

const (
	StatusActive   Status = "active"
	StatusInactive Status = "inactive"
)

type BaseUser struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserPublicID    string             `json:"userPublicId" bson:"userPublicId"`
	Role            Role               `json:"role" bson:"role"`
	Name            string             `json:"name" bson:"name"`
	Email           string             `json:"email,omitempty" bson:"email,omitempty"`
	Password        string             `json:"password,omitempty" bson:"password,omitempty"`
	Provider        string             `json:"provider,omitempty" bson:"provider,omitempty"`
	Gender          Gender             `json:"gender,omitempty" bson:"gender,omitempty"`
	Dob             time.Time          `json:"dob,omitempty" bson:"dob,omitempty"`
	Phone           string             `json:"phone,omitempty" bson:"phone,omitempty"`
	PhoneLookupHash string             `json:"-" bson:"phoneLookupHash,omitempty"`
	AvatarUrl       string             `json:"avatarUrl,omitempty" bson:"avatarUrl,omitempty"`
	Status          Status             `json:"status" bson:"status"`
	// MustSetPassword is set when an admin creates the account: login is
	// blocked until the patient completes the invite link (or forgot-password).
	MustSetPassword  bool      `json:"mustSetPassword,omitempty" bson:"mustSetPassword,omitempty"`
	ResetToken       string    `json:"resetToken,omitempty" bson:"resetToken,omitempty"`
	ResetTokenExpiry time.Time `json:"resetTokenExpiry,omitempty" bson:"resetTokenExpiry,omitempty"`
	CreatedAt        time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt" bson:"updatedAt"`
}
