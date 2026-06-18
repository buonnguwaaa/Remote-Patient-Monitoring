package user

type MonitoringType string

const (
	MonitoringBloodPressure MonitoringType = "bp"
	MonitoringGlucose       MonitoringType = "glucose"
)

func (p *Patient) AllowsMeasurementType(measurementType string) bool {
	for _, mt := range p.MonitoringTypes {
		if string(mt) == measurementType {
			return true
		}
	}
	return false
}

type Patient struct {
	BaseUser              `bson:",inline"`
	InsuranceNumber       string           `json:"insuranceNumber,omitempty" bson:"insuranceNumber,omitempty"`
	CCCD                  string           `json:"cccd,omitempty" bson:"cccd,omitempty"`
	EmergencyContactName  string           `json:"emergencyContactName,omitempty" bson:"emergencyContactName,omitempty"`
	EmergencyContactPhone string           `json:"emergencyContactPhone,omitempty" bson:"emergencyContactPhone,omitempty"`
	MedicalHistory        string           `json:"medicalHistory,omitempty" bson:"medicalHistory,omitempty"`
	MonitoringTypes       []MonitoringType `json:"monitoringTypes,omitempty" bson:"monitoringTypes,omitempty"`
}
