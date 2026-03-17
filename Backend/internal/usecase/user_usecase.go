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

type UpdateUserInput struct {
	ID     string
	Name   string
	Email  string
	Gender string
	Phone  string
	// Doctor profile
	Specialization    string
	LicenseNumber     string
	Workplace         string
	YearsOfExperience int
	// Nurse profile
	NurseLicenseNumber     string
	NurseDepartment        string
	NurseYearsOfExperience int
	// Avatar
	AvatarUrl string
}

type DeleteUserInput struct {
	ID string
}
