package usecase

import (
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AssignPatientInput struct {
	PatientID  string `json:"patientId" binding:"required"`
	DoctorID   string `json:"doctorId"` // Can be empty if only assigning nurse
	NurseID    string `json:"nurseId"`  // Can be empty if only assigning doctor
	AssignedBy string
}

type GetAssignmentsByRoleInput struct {
	UserID string
	Role   userDomain.Role
}

type AssignmentResponse struct {
	ID          primitive.ObjectID `json:"id"`
	PatientID   primitive.ObjectID `json:"patientId"`
	PatientName string             `json:"patientName,omitempty"`
	DoctorID    primitive.ObjectID `json:"doctorId,omitempty"`
	DoctorName  string             `json:"doctorName,omitempty"`
	NurseID     primitive.ObjectID `json:"nurseId,omitempty"`
	NurseName   string             `json:"nurseName,omitempty"`
	AssignedBy  primitive.ObjectID `json:"assignedBy"`
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
}
