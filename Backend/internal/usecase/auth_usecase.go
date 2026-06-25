package usecase

import (
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type RegisterInput struct {
	Name              string
	Email             string
	Password          string
	ConfirmedPassword string
	Role              domain.Role
	Gender            domain.Gender
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
	Email                string
	OTP                  string
	NewPassword          string
	ConfirmedNewPassword string
}

type ActivateAccountInput struct {
	Email string
	OTP   string
}

type ResendActivationEmailInput struct {
	Email string
}
