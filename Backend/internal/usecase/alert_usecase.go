package usecase

type GetAlertsInput struct {
	PatientID string
	Status    string
	Severity  string
	IsLatest  bool
}

type UpdateAlertAcknowledgementByIDInput struct {
	AlertID        string
	AcknowledgedBy string
}
