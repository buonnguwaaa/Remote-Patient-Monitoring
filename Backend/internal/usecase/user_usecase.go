package usecase

import (
	"time"

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

	DiseaseBloodPressure *bool
	DiseaseGlucose       *bool
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
	Specialization            string
	YearsOfExperience         int
	AcademicDegree            domain.AcademicDegree
	ProfessionalQualification domain.ProfessionalQualification
	AcademicTitle             domain.AcademicTitle
}

type NurseFieldsInput struct {
	YearsOfExperience int
}

type PatientProfileFieldsInput struct {
	InsuranceNumber       string
	CCCD                  string
	EmergencyContactName  string
	EmergencyContactPhone string
	MedicalHistory        string
	DiseaseTypes          *domain.DiseaseTypes
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

type CreatePatientInput struct {
	Name   string
	Email  string
	Phone  string
	Gender domain.Gender
	Dob    time.Time
	PatientProfileFieldsInput
}

type CreateMedicalStaffInput struct {
	Name              string
	Email             string
	Phone             string
	Password          string
	ConfirmedPassword string
	Gender            domain.Gender
	Dob               time.Time
	Status            domain.Status
	YearsOfExperience int
	StaffFieldsInput
}

type CreateDoctorInput struct {
	CreateMedicalStaffInput
	Specialization            string
	AcademicDegree            domain.AcademicDegree
	ProfessionalQualification domain.ProfessionalQualification
	AcademicTitle             domain.AcademicTitle
}

type CreateNurseInput struct {
	CreateMedicalStaffInput
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
