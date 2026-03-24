package usecase

import (
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type GetUsersInput struct {
	Name      string
	Email     string
	Gender    domain.Gender
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}

type GetUserByIDInput struct {
	ID string
}

type UpdateUserInfoInput struct {
	ID        string
	Name      string
	Email     string
	Gender    domain.Gender
	Phone     string
	AvatarUrl string
	// Shared staff fields
	DepartmentID  string
	LicenseNumber string
	Workplace     string
	// Doctor specific
	Specialization    string
	YearsOfExperience int
	// Nurse specific
	Ward string
	// Patient specific
	InsuranceNumber       string
	CCCD                  string
	EmergencyContactName  string
	EmergencyContactPhone string
	MedicalHistory        string
}

type UpdateUserStatusInput struct {
	ID     string
	Status domain.Status
}

type UpdatePatientProfileInput struct {
	ID                    string
	Name                  string
	Phone                 string
	InsuranceNumber       string
	CCCD                  string
	EmergencyContactName  string
	EmergencyContactPhone string
	MedicalHistory        string
}

type DeleteUserInput struct {
	ID string
}
