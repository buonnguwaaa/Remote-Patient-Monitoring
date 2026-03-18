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
	// Shared staff fields
	DepartmentID  string
	LicenseNumber string
	Workplace     string
	// Doctor specific
	Specialization    string
	YearsOfExperience int
	// Nurse specific
	Ward string
}

type DeleteUserInput struct {
	ID string
}
