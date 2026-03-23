package usecase

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Member struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Avatar    string `json:"avatar"`
	CreatedAt string `json:"createdAt"`
}

type CreateDepartmentInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateDepartmentInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type GetDepartmentMembersInput struct {
	DepartmentID string
}

type AddDepartmentMemberInput struct {
	DepartmentID string
	UserID       string
}

type DepartmentResponse struct {
	ID          primitive.ObjectID `json:"id"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	MemberCount int                `json:"memberCount"` // How many doctors/nurses in this dept
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
}
