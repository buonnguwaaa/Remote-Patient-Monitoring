package user

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MedicalStaff struct {
	BaseUser      `bson:",inline"`
	DepartmentID  primitive.ObjectID `json:"departmentId,omitempty" bson:"departmentId,omitempty"`
	Workplace     string             `json:"workplace,omitempty" bson:"workplace,omitempty"`
	LicenseNumber string             `json:"licenseNumber,omitempty" bson:"licenseNumber,omitempty"`
	YearsOfExperience int             `json:"yearsOfExperience,omitempty" bson:"yearsOfExperience,omitempty"`
}
