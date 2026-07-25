package dto

import (
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
)

type RegisterRequest struct {
	Name              string        `json:"name" example:"John Doe" binding:"required"`
	Email             string        `json:"email,omitempty" example:"john.doe@example.com" binding:"omitempty,email"`
	Phone             string        `json:"phone,omitempty" example:"+84901234567"`
	Password          string        `json:"password" example:"SecurePass123!" binding:"required,min=6"`
	ConfirmedPassword string        `json:"confirmedPassword" example:"SecurePass123!" binding:"required,min=6"`
	Gender            domain.Gender `json:"gender" example:"M" binding:"required"`
	Dob               string        `json:"dob" example:"1990-05-15" binding:"required"`
	PatientProfileFieldsRequest
}

type LoginRequest struct {
	Identifier string `json:"identifier,omitempty" example:"john.doe@example.com"`
	Email      string `json:"email,omitempty" example:"john.doe@example.com" binding:"omitempty,email"`
	Phone      string `json:"phone,omitempty" example:"+84901234567"`
	Password   string `json:"password" example:"SecurePass123!" binding:"required,min=6"`
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

type VerifyResetOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	OTP   string `json:"otp" binding:"required,len=6,numeric"`
}

type ResetPasswordRequest struct {
	Email                string `json:"email" example:"john.doe@example.com" binding:"required,email"`
	OTP                  string `json:"otp" example:"123456" binding:"required,len=6,numeric"`
	NewPassword          string `json:"newPassword" binding:"required,min=6"`
	ConfirmedNewPassword string `json:"confirmedNewPassword" binding:"required,min=6,eqfield=NewPassword"`
}

type AcceptInviteApiRequest struct {
	Token             string `json:"token" binding:"required"`
	Password          string `json:"password" binding:"required,min=6"`
	ConfirmedPassword string `json:"confirmedPassword" binding:"required,min=6"`
}
