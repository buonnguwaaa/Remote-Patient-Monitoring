package services

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type userService struct {
	repo repositories.UserRepository
}

type UserService interface {
	CreateUser(context.Context, *dto.CreateUserRequest) (*dto.UserResponse, error)
	GetUserByID(context.Context, string) (*dto.UserResponse, error)
}

func NewUserService(repo repositories.UserRepository) UserService {
	return &userService{
		repo: repo,
	}
}

func (s *userService) CreateUser(ctx context.Context, req *dto.CreateUserRequest) (*dto.UserResponse, error) {
	dob, err := time.Parse("2006-01-02", req.Dob)
	if err != nil {
		return nil, err
	}
	u := &users.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Role:     req.Role,
		Gender:   req.Gender,
		Dob:      dob,
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

func (s *userService) GetUserByID(ctx context.Context, id string) (*dto.UserResponse, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	user, err := s.repo.FindByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	return &dto.UserResponse{
		ID:        user.ID.Hex(),
		Name:      user.Name,
		Email:     user.Email,
		Role:      user.Role,
		Gender:    user.Gender,
		Dob:       user.Dob.Format("2006-01-02"),
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}, nil
}
