package dto

import (
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type RegisterRequest struct {
	Name              string        `json:"name" example:"John Doe" binding:"required"`
	Email             string        `json:"email" example:"john.doe@example.com" binding:"required,email"`
	Password          string        `json:"password" example:"SecurePass123!" binding:"required,min=6"`
	ConfirmedPassword string        `json:"confirmedPassword" example:"SecurePass123!" binding:"required,min=8"`
	Role              domain.Role   `json:"role" example:"patient" binding:"required"`
	Gender            domain.Gender `json:"gender" example:"M" binding:"required"`
	Dob               string        `json:"dob" example:"1990-05-15" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" example:"john.doe@example.com" binding:"required,email"`
	Password string `json:"password" example:"SecurePass123!" binding:"required,min=6"`
}

type LoginResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	ResetToken           string `json:"resetToken" binding:"required"`
	NewPassword          string `json:"newPassword" binding:"required,min=6"`
	ConfirmedNewPassword string `json:"confirmedNewPassword" binding:"required,min=6,eqfield=NewPassword"`
}

type ActivateAccountRequest struct {
	Email string `json:"email" example:"john.doe@example.com" binding:"required,email"`
	OTP   string `json:"otp" example:"123456" binding:"required,len=6,numeric"`
}

type ResendActivationEmailRequest struct {
	Email string `json:"email" binding:"required,email"`
}
