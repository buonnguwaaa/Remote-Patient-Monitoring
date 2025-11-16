package dto

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
)

type UserInfoResponse struct {
	ID        string       `json:"id" example:"507f1f77bcf86cd799439011"`
	Name      string       `json:"name" example:"John Doe"`
	Email     string       `json:"email" example:"john.doe@example.com"`
	Provider  string       `json:"provider" example:"local"`
	Role      users.Role   `json:"role" example:"patient"`
	Gender    users.Gender `json:"gender" example:"M"`
	Dob       string       `json:"dob" example:"1990-05-15"`
	CreatedAt string       `json:"createdAt" example:"2025-10-25T12:00:00Z"`
	UpdatedAt string       `json:"updatedAt" example:"2025-10-25T12:00:00Z"`
}
