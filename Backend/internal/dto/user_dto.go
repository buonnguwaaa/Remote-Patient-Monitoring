package dto

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"time"
)

type CreateUserRequest struct {
	Name     string       `json:"name" example:"John Doe" binding:"required"`
	Email    string       `json:"email" example:"john.doe@example.com" binding:"required,email"`
	Password string       `json:"password" example:"SecurePass123!" binding:"required,min=8"`
	Role     users.Role   `json:"role" example:"patient" binding:"required"`
	Gender   users.Gender `json:"gender" example:"M" binding:"required"`
	Dob      string       `json:"dob" example:"1990-05-15" binding:"required"`
}

type UserResponse struct {
	ID        string       `json:"id" example:"507f1f77bcf86cd799439011"`
	Name      string       `json:"name" example:"John Doe"`
	Email     string       `json:"email" example:"john.doe@example.com"`
	Role      users.Role   `json:"role" example:"patient"`
	Gender    users.Gender `json:"gender" example:"M"`
	Dob       string       `json:"dob" example:"1990-05-15"`
	CreatedAt string       `json:"createdAt" example:"2025-10-25T12:00:00Z"`
	UpdatedAt string       `json:"updatedAt" example:"2025-10-25T12:00:00Z"`
}

// Login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthTokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type LoginResponse struct {
	Tokens AuthTokens   `json:"tokens"`
	User   UserResponse `json:"user"`
}

// Refresh Token
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type RefreshTokenResponse struct {
	AccessToken string `json:"access_token"`
}

// Helpers
func ToUserResponse(u users.User) UserResponse {
	var dobStr string
	if !u.Dob.IsZero() {
		dobStr = u.Dob.Format("2006-01-02")
	}
	return UserResponse{
		ID:        u.ID.Hex(),
		Name:      u.Name,
		Email:     u.Email,
		Role:      u.Role,
		Gender:    u.Gender,
		Dob:       dobStr,
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
		UpdatedAt: u.UpdatedAt.Format(time.RFC3339),
	}
}
