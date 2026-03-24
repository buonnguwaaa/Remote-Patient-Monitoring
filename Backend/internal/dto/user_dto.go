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
	Status    domain.Status `json:"status"`
	CreatedAt string        `json:"createdAt"`
	UpdatedAt string        `json:"updatedAt"`
}

type PatientInfoResponse struct {
	BaseUserInfoResponse
	PatientCode           string `json:"patientCode,omitempty"`
	InsuranceNumber       string `json:"insuranceNumber,omitempty"`
	CCCD                  string `json:"cccd,omitempty"`
	EmergencyContactName  string `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone string `json:"emergencyContactPhone,omitempty"`
	MedicalHistory        string `json:"medicalHistory,omitempty"`
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

type UpdateBaseUserRequest struct {
	Name   string        `json:"name"`
	Email  string        `json:"email"`
	Gender domain.Gender `json:"gender"`
	Phone  string        `json:"phone"`
}

type UpdateUserStatusRequest struct {
	Status domain.Status `json:"status" binding:"required"`
}

type UpdatePatientRequest struct {
	UpdateBaseUserRequest
	InsuranceNumber       string `json:"insuranceNumber"`
	CCCD                  string `json:"cccd"`
	EmergencyContactName  string `json:"emergencyContactName"`
	EmergencyContactPhone string `json:"emergencyContactPhone"`
	MedicalHistory        string `json:"medicalHistory"`
}

type UpdateMyPatientProfileRequest struct {
	Name                  string `json:"name" binding:"required"`
	Phone                 string `json:"phone"`
	InsuranceNumber       string `json:"insuranceNumber"`
	CCCD                  string `json:"cccd"`
	EmergencyContactName  string `json:"emergencyContactName"`
	EmergencyContactPhone string `json:"emergencyContactPhone"`
	MedicalHistory        string `json:"medicalHistory"`
}

// UpdateMyPatientProfileRawRequest keeps backward-compatible detection for sensitive fields
// that are not allowed to be updated from the generic profile screen.
type UpdateMyPatientProfileRawRequest struct {
	UpdateMyPatientProfileRequest
	Email *string `json:"email,omitempty"`
}

type UpdateMedicalStaffRequest struct {
	UpdateBaseUserRequest
	DepartmentID  string `json:"departmentId"`
	LicenseNumber string `json:"licenseNumber"`
	Workplace     string `json:"workplace"`
}

type UpdateDoctorRequest struct {
	UpdateMedicalStaffRequest
	Specialization    string `json:"specialization"`
	YearsOfExperience int    `json:"yearsOfExperience"`
}

type UpdateNurseRequest struct {
	UpdateMedicalStaffRequest
	Ward string `json:"ward"`
}
