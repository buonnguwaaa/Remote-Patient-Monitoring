package user

type Nurse struct {
	MedicalStaff `bson:",inline"`
	Ward              string `json:"ward,omitempty" bson:"ward,omitempty"`
	YearsOfExperience int    `json:"yearsOfExperience,omitempty" bson:"yearsOfExperience,omitempty"`
}
