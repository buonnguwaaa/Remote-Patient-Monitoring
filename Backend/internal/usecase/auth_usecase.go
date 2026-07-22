package usecase

import (
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type RegisterInput struct {
	Name              string
	Email             string
	Phone             string
	Password          string
	ConfirmedPassword string
	Gender            domain.Gender
	Dob               time.Time
	PatientProfileFieldsInput
}

type LoginInput struct {
	Identifier string
	Password   string
}

type MeInput struct {
	UserID string
}

type RefreshInput struct {
	RefreshToken string
}

type LogoutInput struct {
	RefreshToken string
	AccessJTI    string
	AccessExp    time.Time
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
