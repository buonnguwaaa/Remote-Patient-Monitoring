package service

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
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
	UpdateUser(context.Context, *usecase.UpdateUserInput) error
	DeleteUser(context.Context, *usecase.DeleteUserInput) error
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
		dp := user.DoctorProfile
		np := user.NurseProfile
		result = append(result, dto.UserInfoResponse{
			ID:        user.ID.Hex(),
			Name:      user.Name,
			Email:     user.Email,
			Provider:  user.Provider,
			Role:      user.Role,
			Gender:    user.Gender,
			Dob:       user.Dob.Format("2006-01-02"),
			Phone:     user.Phone,
			AvatarUrl: user.AvatarUrl,
			DoctorProfile: func() *dto.DoctorProfileResponse {
				if dp == nil {
					return nil
				}
				return &dto.DoctorProfileResponse{
					Specialization:    dp.Specialization,
					LicenseNumber:     dp.LicenseNumber,
					Workplace:         dp.Workplace,
					YearsOfExperience: dp.YearsOfExperience,
				}
			}(),
			NurseProfile: func() *dto.NurseProfileResponse {
				if np == nil {
					return nil
				}
				return &dto.NurseProfileResponse{
					LicenseNumber:     np.LicenseNumber,
					Department:        np.Department,
					YearsOfExperience: np.YearsOfExperience,
				}
			}(),
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
	dp := user.DoctorProfile
	np := user.NurseProfile
	return &dto.UserInfoResponse{
		ID:        user.ID.Hex(),
		Name:      user.Name,
		Email:     user.Email,
		Provider:  user.Provider,
		Role:      user.Role,
		Gender:    user.Gender,
		Dob:       user.Dob.Format("2006-01-02"),
		Phone:     user.Phone,
		AvatarUrl: user.AvatarUrl,
		DoctorProfile: func() *dto.DoctorProfileResponse {
			if dp == nil {
				return nil
			}
			return &dto.DoctorProfileResponse{
				Specialization:    dp.Specialization,
				LicenseNumber:     dp.LicenseNumber,
				Workplace:         dp.Workplace,
				YearsOfExperience: dp.YearsOfExperience,
			}
		}(),
		NurseProfile: func() *dto.NurseProfileResponse {
			if np == nil {
				return nil
			}
			return &dto.NurseProfileResponse{
				LicenseNumber:     np.LicenseNumber,
				Department:        np.Department,
				YearsOfExperience: np.YearsOfExperience,
			}
		}(),
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}, nil
}

func (s *userService) UpdateUser(ctx context.Context, input *usecase.UpdateUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	updateData := make(map[string]interface{})
	if input.Name != "" {
		updateData["name"] = input.Name
	}
	if input.Email != "" {
		updateData["email"] = input.Email
	}
	if len(input.Roles) > 0 {
		updateData["role"] = domain.Role(input.Roles[0])
	}
	if input.Gender != "" {
		updateData["gender"] = domain.Gender(input.Gender)
	}
	if input.Phone != "" {
		updateData["phone"] = input.Phone
	}
	hasDocProfile := input.Specialization != "" || input.LicenseNumber != "" ||
		input.Workplace != "" || input.YearsOfExperience > 0
	if hasDocProfile {
		doctorProfile := domain.DoctorProfile{
			Specialization:    input.Specialization,
			LicenseNumber:     input.LicenseNumber,
			Workplace:         input.Workplace,
			YearsOfExperience: input.YearsOfExperience,
		}
		updateData["doctorProfile"] = doctorProfile
	}
	hasNurseProfile := input.NurseLicenseNumber != "" || input.NurseDepartment != "" ||
		input.NurseYearsOfExperience > 0
	if hasNurseProfile {
		nurseProfile := domain.NurseProfile{
			LicenseNumber:     input.NurseLicenseNumber,
			Department:        input.NurseDepartment,
			YearsOfExperience: input.NurseYearsOfExperience,
		}
		updateData["nurseProfile"] = nurseProfile
	}
	if input.AvatarUrl != "" {
		updateData["avatarUrl"] = input.AvatarUrl
	}

	return s.repo.Update(ctx, objID, updateData)
}

func (s *userService) DeleteUser(ctx context.Context, input *usecase.DeleteUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	return s.repo.Delete(ctx, objID)
}
