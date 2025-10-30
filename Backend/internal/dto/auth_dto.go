package dto

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
)

type RegisterRequest struct {
	Name              string       `json:"name" example:"John Doe" binding:"required"`
	Email             string       `json:"email" example:"john.doe@example.com" binding:"required,email"`
	Password          string       `json:"password" example:"SecurePass123!" binding:"required,min=8"`
	ConfirmedPassword string       `json:"confirmedPassword" example:"SecurePass123!" binding:"required,min=8"`
	Role              users.Role   `json:"role" example:"patient" binding:"required"`
	Gender            users.Gender `json:"gender" example:"M" binding:"required"`
	Dob               string       `json:"dob" example:"1990-05-15" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" example:"john.doe@example.com" binding:"required,email"`
	Password string `json:"password" example:"SecurePass123!" binding:"required,min=8"`
}
