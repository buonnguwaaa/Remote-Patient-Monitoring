package services

import (
	"context"
	"strings"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
)

type authService struct {
	repo       repositories.UserRepository
	jwtManager *utils.JWTManager
}

func NewAuthService(repo repositories.UserRepository, jwtManager *utils.JWTManager) UserService {
	return &userService{
		repo:       repo,
		jwtManager: jwtManager,
	}
}

// func (s *authService) Register(ctx context.Context, email string, password) {

// }

func (s *authService) Login(ctx context.Context, email string, password string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	u, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return "", errors.New("invalid email")
	}
	
	if !utils.ComparePassword(u.Password, password) {
		return "", errors.New("invalid password")
	}

	token, err := s.jwtManager.GenerateToken(u.ID.Hex(), u.Role)
	if err != nil {
		return "", err
	}

	return token, nil
}
