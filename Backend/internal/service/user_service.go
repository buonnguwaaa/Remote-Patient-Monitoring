package service

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	repository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type userService struct {
	baseUserRepo repository.BaseUserRepository
	patientRepo  repository.PatientRepository
	nurseRepo    repository.StaffRepository[domain.Nurse]
	doctorRepo   repository.StaffRepository[domain.Doctor]
}

var ErrInvalidUserStatus = errors.New("invalid status")

type UserService interface {
	GetBaseUsers(context.Context, *usecase.GetUsersInput) ([]dto.BaseUserInfoResponse, error)
	GetBaseUserByID(context.Context, *usecase.GetUserByIDInput) (*dto.BaseUserInfoResponse, error)
	UpdateBaseUser(context.Context, *usecase.UpdateUserInfoInput) error
	UpdateBaseUserStatus(context.Context, *usecase.UpdateUserStatusInput) error
	DeleteBaseUser(context.Context, *usecase.DeleteUserInput) error

	GetPatients(context.Context, *usecase.GetUsersInput) ([]dto.PatientInfoResponse, error)
	GetPatientByID(context.Context, *usecase.GetUserByIDInput) (*dto.PatientInfoResponse, error)
	UpdatePatient(context.Context, *usecase.UpdateUserInfoInput) error
	UpdatePatientProfile(context.Context, *usecase.UpdatePatientProfileInput) error

	GetDoctors(context.Context, *usecase.GetUsersInput) ([]dto.DoctorInfoResponse, error)
	GetDoctorByID(context.Context, *usecase.GetUserByIDInput) (*dto.DoctorInfoResponse, error)
	UpdateDoctor(context.Context, *usecase.UpdateUserInfoInput) error

	GetNurses(context.Context, *usecase.GetUsersInput) ([]dto.NurseInfoResponse, error)
	GetNurseByID(context.Context, *usecase.GetUserByIDInput) (*dto.NurseInfoResponse, error)
	UpdateNurse(context.Context, *usecase.UpdateUserInfoInput) error
}

func NewUserService(
	baseUserRepo repository.BaseUserRepository,
	patientRepo repository.PatientRepository,
	nurseRepo repository.StaffRepository[domain.Nurse],
	doctorRepo repository.StaffRepository[domain.Doctor],
) UserService {
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
		Gender:    string(input.Gender),
		Limit:     input.Limit,
		Offset:    input.Offset,
		SortOrder: input.SortOrder,
	}

	users, err := s.baseUserRepo.FindWithFilter(ctx, repoFilter)
	if err != nil {
		return nil, err
	}

	result := make([]dto.BaseUserInfoResponse, 0, len(users))
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

func (s *userService) UpdateBaseUser(ctx context.Context, input *usecase.UpdateUserInfoInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	updateData := buildBaseUpdateData(input)
	return s.baseUserRepo.Update(ctx, objID, updateData)
}

func (s *userService) UpdateBaseUserStatus(ctx context.Context, input *usecase.UpdateUserStatusInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	if input.Status != domain.StatusActive && input.Status != domain.StatusInactive {
		return ErrInvalidUserStatus
	}

	updateData := map[string]interface{}{
		"status": input.Status,
	}

	return s.baseUserRepo.Update(ctx, objID, updateData)
}

func (s *userService) DeleteBaseUser(ctx context.Context, input *usecase.DeleteUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	return s.baseUserRepo.Delete(ctx, objID)
}

func (s *userService) GetPatients(ctx context.Context, input *usecase.GetUsersInput) ([]dto.PatientInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    string(input.Gender),
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

func (s *userService) GetPatientByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.PatientInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}

	user, err := s.patientRepo.FindPatientByID(ctx, objID)
	if err != nil {
		return nil, err
	}

	return mapPatient(user), nil
}

func (s *userService) UpdatePatient(ctx context.Context, input *usecase.UpdateUserInfoInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	updateData := buildBaseUpdateData(input)
	mergeInto(updateData, buildPatientUpdateData(&input.PatientProfileFieldsInput))

	return s.patientRepo.Update(ctx, objID, updateData)
}

func (s *userService) UpdatePatientProfile(ctx context.Context, input *usecase.UpdatePatientProfileInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	if err := validatePatientProfileUpdate(input); err != nil {
		return err
	}

	updateData := buildPatientProfileSelfUpdateData(input)
	return s.patientRepo.Update(ctx, objID, updateData)
}

func (s *userService) GetDoctors(ctx context.Context, input *usecase.GetUsersInput) ([]dto.DoctorInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    string(input.Gender),
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

func (s *userService) GetDoctorByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.DoctorInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}

	user, err := s.doctorRepo.FindStaffByID(ctx, objID)
	if err != nil {
		return nil, err
	}

	return mapDoctor(user), nil
}

func (s *userService) UpdateDoctor(ctx context.Context, input *usecase.UpdateUserInfoInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	updateData := buildBaseUpdateData(input)

	staffData, err := buildStaffUpdateData(&input.StaffFieldsInput)
	if err != nil {
		return err
	}
	mergeInto(updateData, staffData)
	mergeInto(updateData, buildDoctorUpdateData(&input.DoctorFieldsInput))

	return s.doctorRepo.Update(ctx, objID, updateData)
}

func (s *userService) GetNurses(ctx context.Context, input *usecase.GetUsersInput) ([]dto.NurseInfoResponse, error) {
	repoFilter := repository.UserFilter{
		Name:      input.Name,
		Email:     input.Email,
		Gender:    string(input.Gender),
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

func (s *userService) GetNurseByID(ctx context.Context, input *usecase.GetUserByIDInput) (*dto.NurseInfoResponse, error) {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}

	user, err := s.nurseRepo.FindStaffByID(ctx, objID)
	if err != nil {
		return nil, err
	}

	return mapNurse(user), nil
}

func (s *userService) UpdateNurse(ctx context.Context, input *usecase.UpdateUserInfoInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	updateData := buildBaseUpdateData(input)

	staffData, err := buildStaffUpdateData(&input.StaffFieldsInput)
	if err != nil {
		return err
	}
	mergeInto(updateData, staffData)
	mergeInto(updateData, buildNurseUpdateData(&input.NurseFieldsInput))

	return s.nurseRepo.Update(ctx, objID, updateData)
}

func buildBaseUpdateData(input *usecase.UpdateUserInfoInput) map[string]interface{} {
	updateData := make(map[string]interface{})

	if value := strings.TrimSpace(input.Name); value != "" {
		updateData["name"] = value
	}
	if value := strings.ToLower(strings.TrimSpace(input.Email)); value != "" {
		updateData["email"] = value
	}
	if input.Gender != "" {
		updateData["gender"] = input.Gender
	}
	if value := strings.TrimSpace(input.Phone); value != "" {
		updateData["phone"] = value
	}
	if value := strings.TrimSpace(input.AvatarUrl); value != "" {
		updateData["avatarUrl"] = value
	}

	return updateData
}

func buildPatientUpdateData(input *usecase.PatientProfileFieldsInput) map[string]interface{} {
	updateData := make(map[string]interface{})

	if value := strings.TrimSpace(input.InsuranceNumber); value != "" {
		updateData["insuranceNumber"] = value
	}
	if value := strings.TrimSpace(input.CCCD); value != "" {
		updateData["cccd"] = value
	}
	if value := strings.TrimSpace(input.EmergencyContactName); value != "" {
		updateData["emergencyContactName"] = value
	}
	if value := strings.TrimSpace(input.EmergencyContactPhone); value != "" {
		updateData["emergencyContactPhone"] = value
	}
	if value := strings.TrimSpace(input.MedicalHistory); value != "" {
		updateData["medicalHistory"] = value
	}

	return updateData
}

func buildPatientProfileSelfUpdateData(input *usecase.UpdatePatientProfileInput) map[string]interface{} {
	updateData := make(map[string]interface{})

	if value := strings.TrimSpace(input.Name); value != "" {
		updateData["name"] = value
	}
	if value := strings.TrimSpace(input.Phone); value != "" {
		updateData["phone"] = value
	}

	mergeInto(updateData, buildPatientUpdateData(&input.PatientProfileFieldsInput))
	return updateData
}

func buildStaffUpdateData(input *usecase.StaffFieldsInput) (map[string]interface{}, error) {
	updateData := make(map[string]interface{})

	if value := strings.TrimSpace(input.DepartmentID); value != "" {
		departmentID, err := primitive.ObjectIDFromHex(value)
		if err != nil {
			return nil, err
		}
		updateData["departmentID"] = departmentID
	}
	if value := strings.TrimSpace(input.LicenseNumber); value != "" {
		updateData["licenseNumber"] = value
	}
	if value := strings.TrimSpace(input.Workplace); value != "" {
		updateData["workplace"] = value
	}

	return updateData, nil
}

func buildDoctorUpdateData(input *usecase.DoctorFieldsInput) map[string]interface{} {
	updateData := make(map[string]interface{})

	if value := strings.TrimSpace(input.Specialization); value != "" {
		updateData["specialization"] = value
	}
	if input.YearsOfExperience > 0 {
		updateData["yearsOfExperience"] = input.YearsOfExperience
	}

	return updateData
}

func buildNurseUpdateData(input *usecase.NurseFieldsInput) map[string]interface{} {
	updateData := make(map[string]interface{})

	if value := strings.TrimSpace(input.Ward); value != "" {
		updateData["ward"] = value
	}

	return updateData
}

func mergeInto(target map[string]interface{}, source map[string]interface{}) {
	for key, value := range source {
		target[key] = value
	}
}

func mapPatient(user *domain.Patient) *dto.PatientInfoResponse {
	return &dto.PatientInfoResponse{
		BaseUserInfoResponse:  mapBaseUser(user.BaseUser),
		PatientCode:           util.GeneratePatientCode(user.ID),
		InsuranceNumber:       user.InsuranceNumber,
		CCCD:                  user.CCCD,
		EmergencyContactName:  user.EmergencyContactName,
		EmergencyContactPhone: user.EmergencyContactPhone,
		MedicalHistory:        user.MedicalHistory,
	}
}

func mapDoctor(user *domain.Doctor) *dto.DoctorInfoResponse {
	return &dto.DoctorInfoResponse{
		StaffInfoResponse: dto.StaffInfoResponse{
			BaseUserInfoResponse: mapBaseUser(user.BaseUser),
			DepartmentID:         user.DepartmentID.Hex(),
			Workplace:            user.Workplace,
			LicenseNumber:        user.LicenseNumber,
		},
		Specialization:    user.Specialization,
		YearsOfExperience: user.YearsOfExperience,
	}
}

func mapNurse(user *domain.Nurse) *dto.NurseInfoResponse {
	return &dto.NurseInfoResponse{
		StaffInfoResponse: dto.StaffInfoResponse{
			BaseUserInfoResponse: mapBaseUser(user.BaseUser),
			DepartmentID:         user.DepartmentID.Hex(),
			Workplace:            user.Workplace,
			LicenseNumber:        user.LicenseNumber,
		},
		Ward: user.Ward,
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
		Dob:       formatDate(user.Dob),
		Phone:     user.Phone,
		AvatarUrl: user.AvatarUrl,
		Status:    user.Status,
		CreatedAt: formatDateTime(user.CreatedAt),
		UpdatedAt: formatDateTime(user.UpdatedAt),
	}
}

func formatDate(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.Format("2006-01-02")
}

func formatDateTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}

	return value.Format(time.RFC3339)
}
