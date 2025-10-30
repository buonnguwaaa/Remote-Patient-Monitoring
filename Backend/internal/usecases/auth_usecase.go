package usecases

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"time"
)

type RegisterInput struct {
	Name     string
	Email    string
	Password string
	Role     users.Role
	Gender   users.Gender
	Dob      time.Time
}

type LoginInput struct {
	Email    string
	Password string
}
