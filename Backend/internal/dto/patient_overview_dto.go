package dto

import (
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

// AlertsSummary aggregates open-alert counts for a single patient.
type AlertsSummary struct {
	Total       int        `json:"total"`
	High        int        `json:"high"`
	Medium      int        `json:"medium"`
	Low         int        `json:"low"`
	LastAlertAt *time.Time `json:"lastAlertAt,omitempty"`
}

// PatientOverviewResponse is a single patient row for the nurse/doctor dashboard,
// bundling profile, latest measurement, active threshold and open-alert summary.
type PatientOverviewResponse struct {
	PatientID             string                  `json:"patientId"`
	PatientPublicID       string                  `json:"patientPublicId"`
	Name                  string                  `json:"name"`
	Email                 string                  `json:"email,omitempty"`
	AvatarURL             string                  `json:"avatarUrl,omitempty"`
	Status                string                  `json:"status,omitempty"`
	InsuranceNumber       string                  `json:"insuranceNumber,omitempty"`
	CCCD                  string                  `json:"cccd,omitempty"`
	EmergencyContactName  string                  `json:"emergencyContactName,omitempty"`
	EmergencyContactPhone string                  `json:"emergencyContactPhone,omitempty"`
	DiseaseTypes          userDomain.DiseaseTypes `json:"diseaseTypes"`

	LatestMeasurement *MeasurementResponse `json:"latestMeasurement"`
	LatestThreshold   *ThresholdResponse   `json:"latestThreshold"`
	AlertsSummary     AlertsSummary        `json:"alertsSummary"`
}

// PatientOverviewListResponse is the aggregated payload for the dashboard main screen.
type PatientOverviewListResponse struct {
	TotalPatients      int                       `json:"totalPatients"`
	PatientsWithAlerts int                       `json:"patientsWithAlerts"`
	Patients           []PatientOverviewResponse `json:"patients"`
}
