package dto

import (
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type BaseUserInfoResponse struct {
	ID           string        `json:"id"`
	UserPublicID string        `json:"userPublicId"`
	Name         string        `json:"name"`
	Email        string        `json:"email"`
	Provider     string        `json:"provider"`
	Role         domain.Role   `json:"role"`
	Gender       domain.Gender `json:"gender"`
	Dob          string        `json:"dob"`
	Phone        string        `json:"phone,omitempty"`
	AvatarUrl    string        `json:"avatarUrl,omitempty"`
	Status       domain.Status `json:"status"`
	CreatedAt    string        `json:"createdAt"`
	UpdatedAt    string        `json:"updatedAt"`
}

type PatientInfoResponse struct {
	BaseUserInfoResponse
	InsuranceNumber       string                 `json:"insuranceNumber,omitempty"`
	CCCD                  string                 `json:"cccd,omitempty"`
	EmergencyContactName  string                 `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone string                 `json:"emergencyContactPhone,omitempty"`
	MedicalHistory        string              `json:"medicalHistory,omitempty"`
	DiseaseTypes          domain.DiseaseTypes `json:"diseaseTypes"`
}

type StaffInfoResponse struct {
	BaseUserInfoResponse
	DepartmentID      string `json:"departmentId,omitempty"`
	Workplace         string `json:"workplace,omitempty"`
	LicenseNumber     string `json:"licenseNumber,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty"`
}

type DoctorInfoResponse struct {
	StaffInfoResponse
	Specialization string `json:"specialization,omitempty"`
}

type NurseInfoResponse struct {
	StaffInfoResponse
}

type UpdateBaseUserRequest struct {
	Name   string        `json:"name"`
	Email  string        `json:"email"`
	Gender domain.Gender `json:"gender"`
	Phone  string        `json:"phone"`
}

type UpdateUserStatusRequest struct {
	Status domain.Status `json:"status" binding:"required"`
}

type PatientProfileFieldsRequest struct {
	InsuranceNumber       string                  `json:"insuranceNumber"`
	CCCD                  string                  `json:"cccd"`
	EmergencyContactName  string                  `json:"emergencyContactName"`
	EmergencyContactPhone string                  `json:"emergencyContactPhone"`
	MedicalHistory        string               `json:"medicalHistory"`
	DiseaseTypes          *domain.DiseaseTypes `json:"diseaseTypes,omitempty"`
}

type UpdatePatientRequest struct {
	UpdateBaseUserRequest
	PatientProfileFieldsRequest
}

type UpdateMyPatientProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Phone string `json:"phone"`
	PatientProfileFieldsRequest
}

// UpdateMyPatientProfileRawRequest keeps backward-compatible detection for sensitive fields
// that are not allowed to be updated from the generic profile screen.
type UpdateMyPatientProfileRawRequest struct {
	UpdateMyPatientProfileRequest
	Email *string `json:"email,omitempty"`
}

type UpdateMedicalStaffRequest struct {
	UpdateBaseUserRequest
	DepartmentID      string `json:"departmentId"`
	LicenseNumber     string `json:"licenseNumber"`
	Workplace         string `json:"workplace"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty"`
}

type UpdateDoctorRequest struct {
	UpdateMedicalStaffRequest
	Specialization string `json:"specialization"`
}

type UpdateNurseRequest struct {
	UpdateMedicalStaffRequest
}
