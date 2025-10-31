package services

import (
	"context"
	"errors"
	"fmt"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecases"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"strings"
	"time"
)

type authService struct {
	userRepo   repositories.UserRepository
	tokenRepo  repositories.TokenRepository
	jwtManager *utils.JWTManager
}

type AuthService interface {
	Login(ctx context.Context, input *usecases.LoginInput) (*dto.LoginResponse, error)
	Register(ctx context.Context, input *usecases.RegisterInput) (*dto.UserResponse, error)
	Refresh(ctx context.Context, input *usecases.RefreshInput) (string, error)
}

func NewAuthService(userRepo repositories.UserRepository, tokenRepo repositories.TokenRepository, jwtManager *utils.JWTManager) AuthService {
	return &authService{
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
		jwtManager: jwtManager,
	}
}

func (s *authService) Login(ctx context.Context, input *usecases.LoginInput) (*dto.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	u, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid email")
	}

	if !utils.ComparePassword(u.Password, input.Password) {
		return nil, errors.New("invalid password")
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(u.ID.Hex(), u.Role)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(u.ID.Hex())
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(utils.RefreshTokenTTL)
	tokenHash := utils.HashTokenSHA256(refreshToken)
	if err := s.tokenRepo.Save(ctx, u.ID.Hex(), tokenHash, expiresAt); err != nil {
		return nil, err
	}

	return &dto.LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (s *authService) Register(ctx context.Context, input *usecases.RegisterInput) (*dto.UserResponse, error) {
	existing, _ := s.userRepo.FindByEmail(ctx, input.Email)
	if existing != nil {
		return nil, errors.New("email already exists")
	}
	fmt.Println("pass", input.Password)
	fmt.Println("confirmedPass", input.ConfirmedPassword)
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
	insertedUser, err := s.userRepo.Create(ctx, u)
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

func (s *authService) Refresh(ctx context.Context, input *usecases.RefreshInput) (string, error) {
	refreshTokenClaims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return "", err
	}

	tokenHash := utils.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, refreshTokenClaims.Subject, tokenHash); err != nil || !ok {
		if err != nil {
			return "", err
		}
		return "", errors.New("invalid refresh token")
	}

	user, err := s.userRepo.FindByID(ctx, utils.MustHexToObjectID(refreshTokenClaims.Subject))
	if err != nil {
		return "", err
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(refreshTokenClaims.Subject, user.Role)
	if err != nil {
		return "", err
	}

	return accessToken, nil
}
