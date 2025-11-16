package usecases

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
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

type MeInput struct {
	UserID string
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

type ForgotPasswordInput struct {
	Email string
}

type ResetPasswordInput struct {
	Token                string
	NewPassword          string
	ConfirmedNewPassword string
}

type ActivateAccountInput struct {
	Token string
}

type ResendActivationEmailInput struct {
	Email string
}
