package service

import (
	"context"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	repository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type userService struct {
	baseUserRepo repository.BaseUserRepository
	patientRepo  repository.PatientRepository
	nurseRepo    repository.StaffRepository[domain.Nurse]
	doctorRepo   repository.StaffRepository[domain.Doctor]
}

type UserService interface {
	// BaseUser operations
	GetBaseUsers(context.Context, *usecase.GetUsersInput) ([]dto.BaseUserInfoResponse, error)
	GetBaseUserByID(context.Context, *usecase.GetUserByIDInput) (*dto.BaseUserInfoResponse, error)
	UpdateBaseUser(context.Context, *usecase.UpdateUserInput) error
	DeleteBaseUser(context.Context, *usecase.DeleteUserInput) error
	// Patient operations
	GetPatients(context.Context, *usecase.GetUsersInput) ([]dto.PatientInfoResponse, error)
	GetPatientByID(context.Context, *usecase.GetUserByIDInput) (*dto.PatientInfoResponse, error)
	UpdatePatient(context.Context, *usecase.UpdateUserInput) error
	// Doctor operations
	GetDoctors(context.Context, *usecase.GetUsersInput) ([]dto.DoctorInfoResponse, error)
	GetDoctorByID(context.Context, *usecase.GetUserByIDInput) (*dto.DoctorInfoResponse, error)
	UpdateDoctor(context.Context, *usecase.UpdateUserInput) error
	// Nurse operations
	GetNurses(context.Context, *usecase.GetUsersInput) ([]dto.NurseInfoResponse, error)
	GetNurseByID(context.Context, *usecase.GetUserByIDInput) (*dto.NurseInfoResponse, error)
	UpdateNurse(context.Context, *usecase.UpdateUserInput) error
}

func NewUserService(baseUserRepo repository.BaseUserRepository, patientRepo repository.PatientRepository, nurseRepo repository.StaffRepository[domain.Nurse], doctorRepo repository.StaffRepository[domain.Doctor]) UserService {
	return &userService{
		baseUserRepo: baseUserRepo,
		patientRepo:  patientRepo,
		nurseRepo:    nurseRepo,
		doctorRepo:   doctorRepo,
	}
}

func (s *userService) GetBaseUsers(ctx context.Context, input *usecase.GetUsersInput) ([]dto.BaseUserInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    input.Gender,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	users, err := s.baseUserRepo.FindWithFilter(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	var result []dto.BaseUserInfoResponse
	for _, user := range users {
		result = append(result, mapBaseUser(user))
	}
	return result, nil
}

func (s *userService) GetBaseUserByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.BaseUserInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}
	user, err := s.baseUserRepo.FindByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	resp := mapBaseUser(*user)
	return &resp, nil
}

func (s *userService) GetPatients(ctx context.Context, input *usecase.GetUsersInput) ([]dto.PatientInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    input.Gender,
		Page:      input.Page,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	users, err := s.patientRepo.FindPatients(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	result := make([]dto.PatientInfoResponse, 0, len(users))
	for _, user := range users {
		result = append(result, *mapPatient(&user))
	}
	return result, nil
}

func (s *userService) GetDoctors(ctx context.Context, input *usecase.GetUsersInput) ([]dto.DoctorInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    input.Gender,
		Page:      input.Page,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	users, err := s.doctorRepo.FindStaffs(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	result := make([]dto.DoctorInfoResponse, 0, len(users))
	for _, user := range users {
		result = append(result, *mapDoctor(&user))
	}
	return result, nil
}

func (s *userService) GetNurses(ctx context.Context, input *usecase.GetUsersInput) ([]dto.NurseInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    input.Gender,
		Page:      input.Page,
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	users, err := s.nurseRepo.FindStaffs(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	result := make([]dto.NurseInfoResponse, 0, len(users))
	for _, user := range users {
		result = append(result, *mapNurse(&user))
	}
	return result, nil
}

func (s *userService) GetPatientByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.PatientInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}
	u, err := s.patientRepo.FindPatientByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	return mapPatient(u), nil
}

func (s *userService) UpdatePatient(ctx context.Context, input *usecase.UpdateUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	updateData := buildBaseUpdateData(input)
	return s.patientRepo.Update(ctx, objID, updateData)
}

func (s *userService) GetDoctorByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.DoctorInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}
	u, err := s.doctorRepo.FindStaffByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	return mapDoctor(u), nil
}

func (s *userService) GetNurseByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.NurseInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}
	u, err := s.nurseRepo.FindStaffByID(ctx, objID)
	if err != nil {
		return nil, err
	}
	return mapNurse(u), nil
}

func (s *userService) UpdateBaseUser(ctx context.Context, input *usecase.UpdateUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	updateData := buildBaseUpdateData(input)
	return s.patientRepo.Update(ctx, objID, updateData)
}

func (s *userService) UpdateDoctor(ctx context.Context, input *usecase.UpdateUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	updateData := buildBaseUpdateData(input)
	if input.Specialization != "" {
		updateData["specialization"] = input.Specialization
	}
	if input.LicenseNumber != "" {
		updateData["licenseNumber"] = input.LicenseNumber
	}
	if input.Workplace != "" {
		updateData["workplace"] = input.Workplace
	}
	if input.YearsOfExperience > 0 {
		updateData["yearsOfExperience"] = input.YearsOfExperience
	}
	return s.doctorRepo.Update(ctx, objID, updateData)
}

func (s *userService) UpdateNurse(ctx context.Context, input *usecase.UpdateUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	updateData := buildBaseUpdateData(input)
	if input.LicenseNumber != "" {
		updateData["licenseNumber"] = input.LicenseNumber
	}
	if input.Workplace != "" {
		updateData["workplace"] = input.Workplace
	}
	if input.Ward != "" {
		updateData["ward"] = input.Ward
	}
	return s.nurseRepo.Update(ctx, objID, updateData)
}

func (s *userService) DeleteBaseUser(ctx context.Context, input *usecase.DeleteUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	return s.patientRepo.Delete(ctx, objID)
}

func buildBaseUpdateData(input *usecase.UpdateUserInput) map[string]interface{} {
	updateData := make(map[string]interface{})
	if input.Name != "" {
		updateData["name"] = input.Name
	}
	if input.Email != "" {
		updateData["email"] = input.Email
	}
	if input.Gender != "" {
		updateData["gender"] = domain.Gender(input.Gender)
	}
	if input.Phone != "" {
		updateData["phone"] = input.Phone
	}
	if input.AvatarUrl != "" {
		updateData["avatarUrl"] = input.AvatarUrl
	}
	return updateData
}

func mapPatient(u *domain.Patient) *dto.PatientInfoResponse {
	return &dto.PatientInfoResponse{
		BaseUserInfoResponse: mapBaseUser(u.BaseUser),
	}
}

func mapDoctor(u *domain.Doctor) *dto.DoctorInfoResponse {
	return &dto.DoctorInfoResponse{
		StaffInfoResponse: dto.StaffInfoResponse{
			BaseUserInfoResponse: mapBaseUser(u.BaseUser),
			DepartmentID:         u.DepartmentID.Hex(),
			Workplace:            u.Workplace,
			LicenseNumber:        u.LicenseNumber,
		},
		Specialization:    u.Specialization,
		YearsOfExperience: u.YearsOfExperience,
	}
}

func mapNurse(u *domain.Nurse) *dto.NurseInfoResponse {
	return &dto.NurseInfoResponse{
		StaffInfoResponse: dto.StaffInfoResponse{
			BaseUserInfoResponse: mapBaseUser(u.BaseUser),
			DepartmentID:         u.DepartmentID.Hex(),
			Workplace:            u.Workplace,
			LicenseNumber:        u.LicenseNumber,
		},
		Ward: u.Ward,
	}
}

func mapBaseUser(user domain.BaseUser) dto.BaseUserInfoResponse {
	return dto.BaseUserInfoResponse{
		ID:        user.ID.Hex(),
		Name:      user.Name,
		Email:     user.Email,
		Provider:  user.Provider,
		Role:      user.Role,
		Gender:    user.Gender,
		Dob:       user.Dob.Format("2006-01-02"),
		Phone:     user.Phone,
		AvatarUrl: user.AvatarUrl,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}
}
