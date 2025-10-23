package services

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
)

type userService struct {
	repo users.UserRepository
}

func NewUserService(repo users.UserRepository) users.UserService {
	return &userService{
		repo: repo,
	}
}
