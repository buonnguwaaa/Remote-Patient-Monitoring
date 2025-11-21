package service

import (
	"context"
	"time"

	// "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
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
	filter := input.Filter
	bsonFilter, opts := buildUserFilter(&filter)
	users, err := s.repo.FindAll(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}

	var UserInfoResponses []dto.UserInfoResponse
	for _, user := range users {
		UserInfoResponses = append(UserInfoResponses, dto.UserInfoResponse{
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

	return UserInfoResponses, nil
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

// ========================================================
// =============== Private Helper Functions ===============
// ========================================================
func buildUserFilter(f *usecase.UserFilter) (bson.M, *options.FindOptions) {
	filter := bson.M{}
	opts := options.Find()

	if f == nil {
		return filter, opts
	}

	if f.Name != "" {
		filter["name"] = bson.M{"$regex": f.Name, "$options": "i"}
	}
	if f.Email != "" {
		filter["email"] = bson.M{"$regex": f.Email, "$options": "i"}
	}
	if len(f.Role) > 0 {
		filter["role"] = bson.M{"$in": f.Role}
	}
	if f.Gender != "" {
		filter["gender"] = f.Gender
	}

	opts.SetLimit(int64(f.Limit))
	opts.SetSkip(int64(f.Offset))
	switch f.SortOrder {
	case "asc":
		opts.SetSort(bson.D{{Key: "createdAt", Value: 1}})
	case "desc":
		opts.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	default:
		opts.SetSort(bson.D{{Key: "createdAt", Value: 1}})
	}

	return filter, opts
}
