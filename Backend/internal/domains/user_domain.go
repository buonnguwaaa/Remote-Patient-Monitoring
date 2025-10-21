package domains

type User struct {
	ID   int
	Name string
}

type UserRepository interface {
	// Define methods for user data access here
}

type UserService interface {
	// Define methods for user business logic here
}
