package user

type Doctor struct {
	MedicalStaff   `bson:",inline"`
	Specialization string `json:"specialization,omitempty" bson:"specialization,omitempty"`
}
