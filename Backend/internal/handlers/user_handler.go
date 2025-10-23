package handlers

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
)

type UserHandler struct {
	service users.UserService
}

func NewUserHandler(service users.UserService) *UserHandler {
	return &UserHandler{
		service: service,
	}
}
