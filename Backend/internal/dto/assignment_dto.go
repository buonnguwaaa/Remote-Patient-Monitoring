package dto

import (
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AssignPatientRequest represents the request to assign a patient to doctor/nurse
type AssignPatientRequest struct {
	PatientID string `json:"patientId" binding:"required"`
	DoctorID  string `json:"doctorId"` // Can be empty if only assigning nurse
	NurseID   string `json:"nurseId"`  // Can be empty if only assigning doctor
}

// AssignmentResponse represents the response after assigning patient to doctor/nurse
type AssignmentResponse struct {
	ID              primitive.ObjectID `json:"id"`
	PatientID       primitive.ObjectID `json:"patientId"`
	PatientPublicID     string             `json:"patientPublicId"`
	PatientName         string             `json:"patientName,omitempty"`
	PatientDiseaseTypes *userDomain.DiseaseTypes `json:"patientDiseaseTypes,omitempty"`
	DoctorID        primitive.ObjectID `json:"doctorId,omitempty"`
	DoctorPublicID  string             `json:"doctorPublicId,omitempty"`
	DoctorName      string             `json:"doctorName,omitempty"`
	NurseID         primitive.ObjectID `json:"nurseId,omitempty"`
	NursePublicID   string             `json:"nursePublicId,omitempty"`
	NurseName       string             `json:"nurseName,omitempty"`
	AssignedBy      primitive.ObjectID `json:"assignedBy"`
	CreatedAt       time.Time          `json:"createdAt"`
	UpdatedAt       time.Time          `json:"updatedAt"`
}
