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

type StaffFieldsInput struct {
	DepartmentID  string
	LicenseNumber string
	Workplace     string
}

type DoctorFieldsInput struct {
	Specialization    string
	YearsOfExperience int
}

type NurseFieldsInput struct {
	Ward              string
	YearsOfExperience int
}

type PatientProfileFieldsInput struct {
	InsuranceNumber       string
	CCCD                  string
	EmergencyContactName  string
	EmergencyContactPhone string
	MedicalHistory        string
}

type UpdateUserInfoInput struct {
	ID        string
	Name      string
	Email     string
	Gender    domain.Gender
	Phone     string
	AvatarUrl string
	StaffFieldsInput
	DoctorFieldsInput
	NurseFieldsInput
	PatientProfileFieldsInput
}

type UpdateUserStatusInput struct {
	ID     string
	Status domain.Status
}

type UpdatePatientProfileInput struct {
	ID    string
	Name  string
	Phone string
	PatientProfileFieldsInput
}

type DeleteUserInput struct {
	ID string
}
