package dto

import (
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type BaseUserInfoResponse struct {
	ID        string        `json:"id"`
	Name      string        `json:"name"`
	Email     string        `json:"email"`
	Provider  string        `json:"provider"`
	Role      domain.Role   `json:"role"`
	Gender    domain.Gender `json:"gender"`
	Dob       string        `json:"dob"`
	Phone     string        `json:"phone,omitempty"`
	AvatarUrl string        `json:"avatarUrl,omitempty"`
	CreatedAt string        `json:"createdAt"`
	UpdatedAt string        `json:"updatedAt"`
}

type PatientInfoResponse struct {
	BaseUserInfoResponse
}

type StaffInfoResponse struct {
	BaseUserInfoResponse
	DepartmentID  string `json:"departmentId,omitempty"`
	Workplace     string `json:"workplace,omitempty"`
	LicenseNumber string `json:"licenseNumber,omitempty"`
}

type DoctorInfoResponse struct {
	StaffInfoResponse
	Specialization    string `json:"specialization,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty"`
}

type NurseInfoResponse struct {
	StaffInfoResponse
	Ward string `json:"ward,omitempty"`
}

type UpdateUserRequest struct {
	Name   string   `json:"name"`
	Email  string   `json:"email"`
	Roles  []string `json:"roles"`
	Gender string   `json:"gender"`
	Phone  string   `json:"phone"`
	// Doctor profile
	Specialization    string `json:"specialization"`
	LicenseNumber     string `json:"licenseNumber"`
	Workplace         string `json:"workplace"`
	YearsOfExperience int    `json:"yearsOfExperience"`
	// Nurse profile
	Department             string `json:"department"`
	NurseLicenseNumber     string `json:"nurseLicenseNumber"`
	NurseYearsOfExperience int    `json:"nurseYearsOfExperience"`
}
