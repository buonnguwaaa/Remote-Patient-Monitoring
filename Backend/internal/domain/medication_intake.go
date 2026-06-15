package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MedicationIntake records a single dose the patient marked as taken.
// Dose uses the same MedicationDose shape as prescriptions, including timeOfDay
// and optional custom clock within that bucket.
type MedicationIntake struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PatientID      primitive.ObjectID `json:"patientId" bson:"patientId"`
	PrescriptionID primitive.ObjectID `json:"prescriptionId" bson:"prescriptionId"`
	DrugName       string             `json:"drugName" bson:"drugName"`
	Dosage         string             `json:"dosage" bson:"dosage"`
	Dose           MedicationDose     `json:"dose" bson:"dose"`
	ScheduledDate  time.Time          `json:"scheduledDate" bson:"scheduledDate"`
	TakenAt        time.Time          `json:"takenAt" bson:"takenAt"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt"`
}
