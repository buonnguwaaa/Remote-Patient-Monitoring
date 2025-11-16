package usecases

type UserFilter struct {
	Name      string
	Email     string
	Role      []string
	Gender    string
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}

type GetUsersInput struct {
	Filter UserFilter
}
