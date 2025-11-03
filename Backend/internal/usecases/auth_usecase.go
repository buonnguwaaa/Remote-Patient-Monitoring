package usecases

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"time"
)

type RegisterInput struct {
	Name              string
	Email             string
	Password          string
	ConfirmedPassword string
	Role              users.Role
	Gender            users.Gender
	Dob               time.Time
}

type LoginInput struct {
	Email    string
	Password string
}

type RefreshInput struct {
	RefreshToken string
}

type LogoutInput struct {
	RefreshToken string
}

type GoogleOAuth2Input struct {
	Code string
}
