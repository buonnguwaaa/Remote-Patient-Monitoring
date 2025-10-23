package handlers

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains"
)

type UserHandler struct {
	service domains.UserService
}

func NewUserHandler(service domains.UserService) *UserHandler {
	return &UserHandler{
		service: service,
	}
}
