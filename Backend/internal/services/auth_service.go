package services

import (
	"context"
	"errors"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecases"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"strings"
	"time"
)

type authService struct {
	repo       repositories.UserRepository
	jwtManager *utils.JWTManager
}

type AuthService interface {
	Login(ctx context.Context, input *usecases.LoginInput) (string, error)
	Register(ctx context.Context, input *usecases.RegisterInput) (*dto.UserResponse, error)
}

func NewAuthService(repo repositories.UserRepository, jwtManager *utils.JWTManager) AuthService {
	return &authService{
		repo:       repo,
		jwtManager: jwtManager,
	}
}

func (s *authService) Login(ctx context.Context, input *usecases.LoginInput) (string, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	u, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return "", errors.New("invalid email")
	}

	if !utils.ComparePassword(u.Password, input.Password) {
		return "", errors.New("invalid password")
	}

	token, err := s.jwtManager.GenerateToken(u.ID.Hex(), u.Role)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *authService) Register(ctx context.Context, input *usecases.RegisterInput) (*dto.UserResponse, error) {
	existing, _ := s.repo.FindByEmail(ctx, input.Email)
	if existing != nil {
		return nil, errors.New("email already exists")
	}
	if input.Password != input.ConfirmedPassword {
		return nil, errors.New("password and confirmed password do not match")
	}
	hashedPwd, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}
	u := &users.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: hashedPwd,
		Role:     input.Role,
		Gender:   input.Gender,
		Dob:      input.Dob,
	}
	insertedUser, err := s.repo.Create(ctx, u)
	if err != nil {
		return nil, err
	}
	return &dto.UserResponse{
		ID:        insertedUser.ID.Hex(),
		Name:      insertedUser.Name,
		Email:     insertedUser.Email,
		Role:      insertedUser.Role,
		Gender:    insertedUser.Gender,
		Dob:       insertedUser.Dob.Format("2006-01-02"),
		CreatedAt: insertedUser.CreatedAt.Format(time.RFC3339),
		UpdatedAt: insertedUser.UpdatedAt.Format(time.RFC3339),
	}, nil
}
