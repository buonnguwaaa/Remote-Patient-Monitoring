package usecase

type GetUsersInput struct {
	Name      string
	Email     string
	Gender    string
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}

type GetUserByIDInput struct {
	ID string
}

type UpdateUserInput struct {
	ID        string
	Name      string
	Email     string
	Gender    string
	Phone     string
	AvatarUrl string
	IsActive  *bool
	// Shared staff fields
	DepartmentID  string
	LicenseNumber string
	Workplace     string
	// Doctor specific
	Specialization    string
	YearsOfExperience int
	// Nurse specific
	Ward string
	// Patient specific
	InsuranceNumber       string
	CCCD                  string
	EmergencyContactName  string
	EmergencyContactPhone string
	MedicalHistory        string
}

type UpdatePatientProfileInput struct {
	ID                    string
	Name                  string
	Phone                 string
	InsuranceNumber       string
	CCCD                  string
	EmergencyContactName  string
	EmergencyContactPhone string
	MedicalHistory        string
}

type DeleteUserInput struct {
	ID string
}
