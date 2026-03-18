package dto

type CreateDepartmentRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type AddDepartmentMemberRequest struct {
	UserID string `json:"userId" binding:"required"`
}
