package service

import (
	"context"
	"time"

	// "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type userService struct {
	repo repository.UserRepository
}

type UserService interface {
	GetUsers(context.Context, *usecase.GetUsersInput) ([]dto.UserInfoResponse, error)
	GetUserByID(context.Context, string) (*dto.UserInfoResponse, error)
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{
		repo: repo,
	}
}

func (s *userService) GetUsers(ctx context.Context, input *usecase.GetUsersInput) ([]dto.UserInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Roles:     input.Roles,
		Gender:    input.Gender,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	users, err := s.repo.FindWithFilter(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	var result []dto.UserInfoResponse
	for _, user := range users {
		result = append(result, dto.UserInfoResponse{
			ID:        user.ID.Hex(),
			Name:      user.Name,
			Email:     user.Email,
			Provider:  user.Provider,
			Role:      user.Role,
			Gender:    user.Gender,
			Dob:       user.Dob.Format("2006-01-02"),
			CreatedAt: user.CreatedAt.Format(time.RFC3339),
			UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
		})
	}

	return result, nil
}

func (s *userService) GetUserByID(ctx context.Context, id string) (*dto.UserInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	user, err := s.repo.FindByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	return &dto.UserInfoResponse{
		ID:        user.ID.Hex(),
		Name:      user.Name,
		Email:     user.Email,
		Provider:  user.Provider,
		Role:      user.Role,
		Gender:    user.Gender,
		Dob:       user.Dob.Format("2006-01-02"),
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}, nil
}
