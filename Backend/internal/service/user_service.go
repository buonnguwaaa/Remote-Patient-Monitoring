package service

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	repository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type userService struct {
	baseUserRepo    repository.BaseUserRepository
	patientRepo     repository.PatientRepository
	nurseRepo       repository.StaffRepository[domain.Nurse]
	doctorRepo      repository.StaffRepository[domain.Doctor]
	accountNotifier AccountNotifier
}

var ErrInvalidUserStatus = errors.New("Trạng thái người dùng không hợp lệ")

type UserService interface {
	GetBaseUsers(context.Context, *usecase.GetUsersInput) ([]dto.BaseUserInfoResponse, error)
	GetBaseUserByID(context.Context, *usecase.GetUserByIDInput) (*dto.BaseUserInfoResponse, error)
	UpdateBaseUser(context.Context, *usecase.UpdateUserInfoInput) error
	UpdateBaseUserStatus(context.Context, *usecase.UpdateUserStatusInput) error
	DeleteBaseUser(context.Context, *usecase.DeleteUserInput) error

	CreatePatient(context.Context, *usecase.CreatePatientInput) (*dto.PatientInfoResponse, error)
	ResendPatientInvite(context.Context, *usecase.GetUserByIDInput) error
	GetPatients(context.Context, *usecase.GetUsersInput) ([]dto.PatientInfoResponse, error)
	GetPatientByID(context.Context, *usecase.GetUserByIDInput) (*dto.PatientInfoResponse, error)
	UpdatePatient(context.Context, *usecase.UpdateUserInfoInput) error
	UpdatePatientProfile(context.Context, *usecase.UpdatePatientProfileInput) error

	CreateDoctor(context.Context, *usecase.CreateDoctorInput) (*dto.DoctorInfoResponse, error)
	GetDoctors(context.Context, *usecase.GetUsersInput) ([]dto.DoctorInfoResponse, error)
	GetDoctorByID(context.Context, *usecase.GetUserByIDInput) (*dto.DoctorInfoResponse, error)
	UpdateDoctor(context.Context, *usecase.UpdateUserInfoInput) error

	CreateNurse(context.Context, *usecase.CreateNurseInput) (*dto.NurseInfoResponse, error)
	GetNurses(context.Context, *usecase.GetUsersInput) ([]dto.NurseInfoResponse, error)
	GetNurseByID(context.Context, *usecase.GetUserByIDInput) (*dto.NurseInfoResponse, error)
	UpdateNurse(context.Context, *usecase.UpdateUserInfoInput) error
}

func NewUserService(
	baseUserRepo repository.BaseUserRepository,
	patientRepo repository.PatientRepository,
	nurseRepo repository.StaffRepository[domain.Nurse],
	doctorRepo repository.StaffRepository[domain.Doctor],
	accountNotifier AccountNotifier,
) UserService {
	return &userService{
		baseUserRepo:    baseUserRepo,
		patientRepo:     patientRepo,
		nurseRepo:       nurseRepo,
		doctorRepo:      doctorRepo,
		accountNotifier: accountNotifier,
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

	current, err := s.baseUserRepo.FindByID(ctx, objID)
	if err != nil {
		return err
	}
	if current.Status == input.Status {
		return nil
	}

	updateData := map[string]interface{}{
		"status": input.Status,
	}

	if err := s.baseUserRepo.Update(ctx, objID, updateData); err != nil {
		return err
	}

	if current.Role == domain.RolePatient && input.Status == domain.StatusActive && s.accountNotifier != nil {
		patient, err := s.patientRepo.FindPatientByID(ctx, objID)
		if err != nil {
			log.Printf("[WARN] cannot load activated patient %s for notification: %v", objID.Hex(), err)
			return nil
		}
		patient.Status = domain.StatusActive
		s.notifyPatientActivatedAsync(ctx, patient, false, "")
	}
	return nil
}

func (s *userService) DeleteBaseUser(ctx context.Context, input *usecase.DeleteUserInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}

	return s.baseUserRepo.Delete(ctx, objID)
}

func (s *userService) CreatePatient(ctx context.Context, input *usecase.CreatePatientInput) (*dto.PatientInfoResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	phone := util.NormalizePhone(input.Phone)
	if email == "" && phone == "" {
		return nil, &ValidationError{Field: "contact", Message: "Email hoặc số điện thoại là bắt buộc."}
	}
	profile := &usecase.UpdatePatientProfileInput{
		Name:                      input.Name,
		Phone:                     phone,
		PatientProfileFieldsInput: input.PatientProfileFieldsInput,
	}
	if err := validatePatientProfileUpdate(profile); err != nil {
		return nil, err
	}
	if err := s.ensureContactsAvailable(ctx, email, phone); err != nil {
		return nil, err
	}

	temporaryPassword, err := util.GenerateRandomToken(12)
	if err != nil {
		return nil, err
	}
	hashedPassword, err := util.HashPassword(temporaryPassword)
	if err != nil {
		return nil, err
	}
	phoneHash, err := util.HashPhoneForLookup(phone)
	if err != nil {
		return nil, err
	}

	patient := &domain.Patient{
		BaseUser: domain.BaseUser{
			Name:            strings.TrimSpace(input.Name),
			Email:           email,
			Phone:           phone,
			PhoneLookupHash: phoneHash,
			Password:        hashedPassword,
			Provider:        LocalProvider,
			Role:            domain.RolePatient,
			Gender:          input.Gender,
			Dob:             input.Dob,
			Status:          domain.StatusActive,
			MustSetPassword: true,
		},
		InsuranceNumber:       profile.InsuranceNumber,
		CCCD:                  profile.CCCD,
		EmergencyContactName:  profile.EmergencyContactName,
		EmergencyContactPhone: profile.EmergencyContactPhone,
		MedicalHistory:        profile.MedicalHistory,
	}
	if profile.DiseaseTypes != nil {
		patient.DiseaseTypes = *profile.DiseaseTypes
	}

	created, err := s.patientRepo.Create(ctx, patient)
	if err != nil {
		return nil, err
	}

	inviteURL, err := s.issuePatientInvite(ctx, created.ID)
	if err != nil {
		log.Printf("[WARN] patient %s created but invite token failed: %v", created.ID.Hex(), err)
		return mapPatient(created), nil
	}
	s.notifyPatientActivatedAsync(ctx, created, true, inviteURL)
	return mapPatient(created), nil
}

func (s *userService) ResendPatientInvite(ctx context.Context, input *usecase.GetUserByIDInput) error {
	objID, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return err
	}
	patient, err := s.patientRepo.FindPatientByID(ctx, objID)
	if err != nil {
		return err
	}
	if !patient.MustSetPassword {
		return &ValidationError{Field: "mustSetPassword", Message: "Bệnh nhân đã đặt mật khẩu; không cần gửi lại liên kết."}
	}
	if patient.Email == "" && patient.Phone == "" {
		return &ValidationError{Field: "contact", Message: "Bệnh nhân cần email hoặc số điện thoại để nhận liên kết."}
	}

	inviteURL, err := s.issuePatientInvite(ctx, patient.ID)
	if err != nil {
		return err
	}
	s.notifyPatientActivatedAsync(ctx, patient, true, inviteURL)
	return nil
}

// issuePatientInvite mints a one-time set-password token (15m) and returns the public accept-invite URL.
func (s *userService) issuePatientInvite(ctx context.Context, userID primitive.ObjectID) (string, error) {
	rawToken, err := util.GenerateRandomToken(InviteTokenBytes)
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(ResetPasswordTokenTTL)
	if err := s.baseUserRepo.SetResetTokenByID(ctx, userID, util.HashTokenSHA256(rawToken), expires); err != nil {
		return "", err
	}
	return util.AcceptInviteURL(rawToken), nil
}

// notifyPatientActivatedAsync delivers the activation email/SMS off the
// request path: SMTP and Twilio round-trips take seconds and their failures
// are non-fatal (logged only), so the API response must not wait on them.
// Retries (per channel, with backoff) run inside AccountNotifier; the timeout
// here must cover those attempts.
// For admin-created patients, inviteURL is the set-password link (never a raw password).
func (s *userService) notifyPatientActivatedAsync(ctx context.Context, patient *domain.Patient, createdByAdmin bool, inviteURL string) {
	if s.accountNotifier == nil {
		return
	}
	notifyCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Minute)
	go func() {
		defer cancel()
		if err := s.accountNotifier.NotifyPatientActivated(notifyCtx, patient, createdByAdmin, inviteURL); err != nil {
			log.Printf("[WARN] failed to notify patient %s after retries: %v", patient.ID.Hex(), err)
		} else {
			log.Printf("[INFO] notified patient %s", patient.ID.Hex())
		}
	}()
}

func (s *userService) ensureContactsAvailable(ctx context.Context, email, phone string) error {
	if email != "" {
		if existing, err := s.baseUserRepo.FindByEmail(ctx, email); err == nil && existing != nil {
			return &ConflictError{Field: "email", Message: "Email đã tồn tại."}
		} else if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
			return err
		}
	}
	if phone != "" {
		hash, err := util.HashPhoneForLookup(phone)
		if err != nil {
			return err
		}
		if existing, err := s.baseUserRepo.FindByPhoneLookupHash(ctx, hash); err == nil && existing != nil {
			return &ConflictError{Field: "phone", Message: "Số điện thoại đã tồn tại."}
		} else if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
			return err
		}
	}
	return nil
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
	if input.Phone != "" {
		if err := s.setPatientPhoneUpdate(ctx, objID, input.Phone, updateData); err != nil {
			return err
		}
	}

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
	if input.Phone != "" {
		if err := s.setPatientPhoneUpdate(ctx, objID, input.Phone, updateData); err != nil {
			return err
		}
	}
	return s.patientRepo.Update(ctx, objID, updateData)
}

func (s *userService) setPatientPhoneUpdate(ctx context.Context, patientID primitive.ObjectID, phone string, updateData map[string]interface{}) error {
	normalized := util.NormalizePhone(phone)
	hash, err := util.HashPhoneForLookup(normalized)
	if err != nil {
		return err
	}
	existing, err := s.baseUserRepo.FindByPhoneLookupHash(ctx, hash)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}
	if existing != nil && existing.ID != patientID {
		return &ConflictError{Field: "phone", Message: "Số điện thoại đã tồn tại."}
	}
	updateData["phone"] = normalized
	updateData["phoneLookupHash"] = hash
	return nil
}

func (s *userService) CreateDoctor(ctx context.Context, input *usecase.CreateDoctorInput) (*dto.DoctorInfoResponse, error) {
	staff, err := s.buildMedicalStaff(ctx, &input.CreateMedicalStaffInput, domain.RoleDoctor)
	if err != nil {
		return nil, err
	}
	if err := validateDoctorCredentials(input.AcademicDegree, input.AcademicTitle); err != nil {
		return nil, err
	}

	doctor := &domain.Doctor{
		MedicalStaff:              *staff,
		Specialization:            strings.TrimSpace(input.Specialization),
		AcademicDegree:            input.AcademicDegree,
		ProfessionalQualification: input.ProfessionalQualification,
		AcademicTitle:             input.AcademicTitle,
	}
	created, err := s.doctorRepo.Create(ctx, doctor)
	if err != nil {
		return nil, err
	}
	return mapDoctor(created), nil
}

func (s *userService) CreateNurse(ctx context.Context, input *usecase.CreateNurseInput) (*dto.NurseInfoResponse, error) {
	staff, err := s.buildMedicalStaff(ctx, &input.CreateMedicalStaffInput, domain.RoleNurse)
	if err != nil {
		return nil, err
	}
	staff.YearsOfExperience = input.YearsOfExperience

	created, err := s.nurseRepo.Create(ctx, &domain.Nurse{MedicalStaff: *staff})
	if err != nil {
		return nil, err
	}
	return mapNurse(created), nil
}

func (s *userService) buildMedicalStaff(ctx context.Context, input *usecase.CreateMedicalStaffInput, role domain.Role) (*domain.MedicalStaff, error) {
	name := strings.TrimSpace(input.Name)
	email := strings.ToLower(strings.TrimSpace(input.Email))
	phone := util.NormalizePhone(input.Phone)
	if name == "" {
		return nil, &ValidationError{Field: "name", Message: "Họ tên là bắt buộc."}
	}
	if email == "" {
		return nil, &ValidationError{Field: "email", Message: "Email là bắt buộc."}
	}
	if phone != "" && !patientPhonePattern.MatchString(phone) {
		return nil, &ValidationError{Field: "phone", Message: "Số điện thoại phải gồm 9 đến 15 chữ số."}
	}
	if input.Password != input.ConfirmedPassword {
		return nil, &ValidationError{Field: "confirmedPassword", Message: "Mật khẩu và mật khẩu xác nhận không khớp."}
	}
	if input.Status == "" {
		input.Status = domain.StatusActive
	}
	if input.Status != domain.StatusActive && input.Status != domain.StatusInactive {
		return nil, ErrInvalidUserStatus
	}
	if err := s.ensureContactsAvailable(ctx, email, phone); err != nil {
		return nil, err
	}

	hashedPassword, err := util.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}
	phoneHash, err := util.HashPhoneForLookup(phone)
	if err != nil {
		return nil, err
	}

	var departmentID primitive.ObjectID
	if value := strings.TrimSpace(input.DepartmentID); value != "" {
		departmentID, err = primitive.ObjectIDFromHex(value)
		if err != nil {
			return nil, &ValidationError{Field: "departmentId", Message: "Mã khoa không hợp lệ."}
		}
	}

	return &domain.MedicalStaff{
		BaseUser: domain.BaseUser{
			Name:            name,
			Email:           email,
			Phone:           phone,
			PhoneLookupHash: phoneHash,
			Password:        hashedPassword,
			Provider:        LocalProvider,
			Role:            role,
			Gender:          input.Gender,
			Dob:             input.Dob,
			Status:          input.Status,
		},
		DepartmentID:      departmentID,
		LicenseNumber:     strings.TrimSpace(input.LicenseNumber),
		Workplace:         strings.TrimSpace(input.Workplace),
		YearsOfExperience: input.YearsOfExperience,
	}, nil
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

	_, err = s.doctorRepo.FindStaffByID(ctx, objID)
	if err != nil {
		return err
	}

	mergedDegree := input.AcademicDegree
	mergedTitle := input.AcademicTitle
	if err := validateDoctorCredentials(mergedDegree, mergedTitle); err != nil {
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
	if input.DiseaseTypes != nil {
		updateData["diseaseTypes"] = *input.DiseaseTypes
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
	updateData["academicDegree"] = input.AcademicDegree
	updateData["professionalQualification"] = input.ProfessionalQualification
	updateData["academicTitle"] = input.AcademicTitle

	return updateData
}

func buildNurseUpdateData(input *usecase.NurseFieldsInput) map[string]interface{} {
	updateData := make(map[string]interface{})

	if input.YearsOfExperience > 0 {
		updateData["yearsOfExperience"] = input.YearsOfExperience
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
		InsuranceNumber:       user.InsuranceNumber,
		CCCD:                  user.CCCD,
		EmergencyContactName:  user.EmergencyContactName,
		EmergencyContactPhone: user.EmergencyContactPhone,
		MedicalHistory:        user.MedicalHistory,
		DiseaseTypes:          user.DiseaseTypes,
	}
}

func mapDoctor(user *domain.Doctor) *dto.DoctorInfoResponse {
	return &dto.DoctorInfoResponse{
		StaffInfoResponse: dto.StaffInfoResponse{
			BaseUserInfoResponse: mapBaseUser(user.BaseUser),
			DepartmentID:         user.DepartmentID.Hex(),
			Workplace:            user.Workplace,
			LicenseNumber:        user.LicenseNumber,
			YearsOfExperience:    user.YearsOfExperience,
		},
		Specialization:                 user.Specialization,
		AcademicDegree:                 user.AcademicDegree,
		AcademicDegreeLabel:            user.AcademicDegree.Label(),
		ProfessionalQualification:      user.ProfessionalQualification,
		ProfessionalQualificationLabel: user.ProfessionalQualification.Label(),
		AcademicTitle:                  user.AcademicTitle,
		AcademicTitleLabel:             user.AcademicTitle.Label(),
		DisplayName:                    user.DisplayName(),
	}
}

func mapNurse(user *domain.Nurse) *dto.NurseInfoResponse {
	return &dto.NurseInfoResponse{
		StaffInfoResponse: dto.StaffInfoResponse{
			BaseUserInfoResponse: mapBaseUser(user.BaseUser),
			DepartmentID:         user.DepartmentID.Hex(),
			Workplace:            user.Workplace,
			LicenseNumber:        user.LicenseNumber,
			YearsOfExperience:    user.YearsOfExperience,
		},
	}
}

func mapBaseUser(user domain.BaseUser) dto.BaseUserInfoResponse {
	return dto.BaseUserInfoResponse{
		ID:           user.ID.Hex(),
		UserPublicID: user.UserPublicID,
		Name:         user.Name,
		Email:        user.Email,
		Provider:     user.Provider,
		Role:         user.Role,
		Gender:       user.Gender,
		Dob:          formatDate(user.Dob),
		Phone:        user.Phone,
		AvatarUrl:    user.AvatarUrl,
		Status:       user.Status,
		CreatedAt:    formatDateTime(user.CreatedAt),
		UpdatedAt:    formatDateTime(user.UpdatedAt),
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
