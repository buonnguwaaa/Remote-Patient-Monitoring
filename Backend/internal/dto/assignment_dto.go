package dto

// AssignPatientRequest represents the request to assign a patient to doctor/nurse
type AssignPatientRequest struct {
	PatientID string `json:"patientId" binding:"required"`
	DoctorID  string `json:"doctorId"` // Can be empty if only assigning nurse
	NurseID   string `json:"nurseId"`  // Can be empty if only assigning doctor
}
