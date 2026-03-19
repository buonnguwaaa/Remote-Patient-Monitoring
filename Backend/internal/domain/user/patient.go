package user

type Patient struct {
	BaseUser              `bson:",inline"`
	InsuranceNumber       string `json:"insuranceNumber,omitempty" bson:"insuranceNumber,omitempty"`
	CCCD                  string `json:"cccd,omitempty" bson:"cccd,omitempty"`
	EmergencyContactName  string `json:"emergencyContactName,omitempty" bson:"emergencyContactName,omitempty"`
	EmergencyContactPhone string `json:"emergencyContactPhone,omitempty" bson:"emergencyContactPhone,omitempty"`
	MedicalHistory        string `json:"medicalHistory,omitempty" bson:"medicalHistory,omitempty"`
}
