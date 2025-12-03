package usecase

type GetUsersInput struct {
	Name      string
	Email     string
	Roles     []string
	Gender    string
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}
