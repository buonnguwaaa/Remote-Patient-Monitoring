package dto

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

// DoctorProfileResponse for doctor
type DoctorProfileResponse struct {
	Specialization    string `json:"specialization,omitempty"`
	LicenseNumber     string `json:"licenseNumber,omitempty"`
	Workplace         string `json:"workplace,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty"`
}

// NurseProfileResponse for nurse
type NurseProfileResponse struct {
	LicenseNumber     string `json:"licenseNumber,omitempty"`
	Department        string `json:"department,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty"`
}

type UserInfoResponse struct {
	ID            string                 `json:"id"`
	Name          string                 `json:"name"`
	Email         string                 `json:"email"`
	Provider      string                 `json:"provider"`
	Role          domain.Role            `json:"role"`
	Gender        domain.Gender          `json:"gender"`
	Dob           string                 `json:"dob"`
	Phone         string                 `json:"phone,omitempty"`
	AvatarUrl     string                 `json:"avatarUrl,omitempty"`
	DoctorProfile *DoctorProfileResponse `json:"doctorProfile,omitempty"`
	NurseProfile  *NurseProfileResponse  `json:"nurseProfile,omitempty"`
	CreatedAt     string                 `json:"createdAt"`
	UpdatedAt     string                 `json:"updatedAt"`
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
