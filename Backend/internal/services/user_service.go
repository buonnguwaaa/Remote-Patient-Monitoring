package services

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains"
)

type userService struct {
	repo domains.UserRepository
}

func NewUserService(repo domains.UserRepository) domains.UserService {
	return &userService{
		repo: repo,
	}
}
