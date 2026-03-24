package usecase

type GetAlertsInput struct {
	PatientID string
	DoctorID  string
	Status    string
	Severity  string
	IsLatest  bool
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}

type GetAlertByIDInput struct {
	ID string
}

type UpdateAlertAcknowledgementByIDInput struct {
	AlertID        string
	AcknowledgedBy string
}
