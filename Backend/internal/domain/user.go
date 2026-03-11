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

// DoctorProfile for doctor
type DoctorProfile struct {
	Specialization    string `json:"specialization,omitempty" bson:"specialization,omitempty"`
	LicenseNumber     string `json:"licenseNumber,omitempty" bson:"licenseNumber,omitempty"`
	Workplace         string `json:"workplace,omitempty" bson:"workplace,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty" bson:"yearsOfExperience,omitempty"`
}

// NurseProfile for nurse
type NurseProfile struct {
	LicenseNumber     string `json:"licenseNumber,omitempty" bson:"licenseNumber,omitempty"`
	Department        string `json:"department,omitempty" bson:"department,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty" bson:"yearsOfExperience,omitempty"`
}

type User struct {
	ID           primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Role         Role                `json:"role" bson:"role"`
	Name         string              `json:"name" bson:"name"`
	Email        string              `json:"email" bson:"email"`
	Password     string              `json:"password,omitempty" bson:"password,omitempty"`
	Provider     string              `json:"provider,omitempty" bson:"provider,omitempty"`
	Gender       Gender              `json:"gender,omitempty" bson:"gender,omitempty"`
	Dob          time.Time           `json:"dob,omitempty" bson:"dob,omitempty"`
	Phone        string              `json:"phone,omitempty" bson:"phone,omitempty"`
	AvatarUrl    string              `json:"avatarUrl,omitempty" bson:"avatarUrl,omitempty"`
	DepartmentID *primitive.ObjectID `json:"departmentId,omitempty" bson:"departmentId,omitempty"`
	IsActive     bool                `json:"isActive" bson:"isActive"`
	// Doctor-specific fields
	DoctorProfile *DoctorProfile `json:"doctorProfile,omitempty" bson:"doctorProfile,omitempty"`
	// Nurse-specific fields
	NurseProfile *NurseProfile `json:"nurseProfile,omitempty" bson:"nurseProfile,omitempty"`
	// Token fields
	ResetToken            string    `json:"resetToken,omitempty" bson:"resetToken,omitempty"`
	ResetTokenExpiry      time.Time `json:"resetTokenExpiry,omitempty" bson:"resetTokenExpiry,omitempty"`
	ActivationTokenHash   string    `json:"activationTokenHash,omitempty" bson:"activationTokenHash,omitempty"`
	ActivationTokenExpiry time.Time `json:"activationTokenExpiry,omitempty" bson:"activationTokenExpiry,omitempty"`
	CreatedAt             time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt" bson:"updatedAt"`
}
