package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Assignment struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID  primitive.ObjectID `json:"patientId" bson:"patientId"`
	DoctorID   primitive.ObjectID `json:"doctorId,omitempty" bson:"doctorId,omitempty"` // Optional if assigned to nurse only (rare?) usually both or Doctor primary
	NurseID    primitive.ObjectID `json:"nurseId,omitempty" bson:"nurseId,omitempty"`
	AssignedBy primitive.ObjectID `json:"assignedBy,omitempty" bson:"assignedBy,omitempty"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt"`
}
