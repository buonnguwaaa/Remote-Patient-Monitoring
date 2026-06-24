package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	LocalProvider  = "local"
	GoogleProvider = "google"

	ActivationOTPLength   = 6
	ActivationOTPTTL      = 15 * time.Minute
	ResetPasswordTokenTTL = 15 * time.Minute
)

type AuthService interface {
	Login(ctx context.Context, input *usecase.LoginInput) (*dto.LoginResponse, error)
	Register(ctx context.Context, input *usecase.RegisterInput) (*dto.BaseUserInfoResponse, error)
	Me(ctx context.Context, input *usecase.MeInput) (*dto.BaseUserInfoResponse, error)
	Refresh(ctx context.Context, input *usecase.RefreshInput) (string, error)
	Logout(ctx context.Context, input *usecase.LogoutInput) error
	GetGoogleLoginURL(state string) string
	HandleGoogleOAuth2Callback(ctx context.Context, input *usecase.GoogleOAuth2Input) (*dto.LoginResponse, error)
	ForgotPassword(ctx context.Context, input *usecase.ForgotPasswordInput) error
	ResetPassword(ctx context.Context, input *usecase.ResetPasswordInput) error
	ActivateAccount(ctx context.Context, input *usecase.ActivateAccountInput) error
	ResendActivationEmail(ctx context.Context, input *usecase.ResendActivationEmailInput) error
}

type authService struct {
	baseUserRepo userRepository.BaseUserRepository
	patientRepo  userRepository.PatientRepository
	doctorRepo   userRepository.StaffRepository[domain.Doctor]
	nurseRepo    userRepository.StaffRepository[domain.Nurse]
	tokenRepo    repository.TokenRepository
	jwtManager   *util.JWTManager
}

func NewAuthService(
	baseUserRepo userRepository.BaseUserRepository,
	patientRepo userRepository.PatientRepository,
	doctorRepo userRepository.StaffRepository[domain.Doctor],
	nurseRepo userRepository.StaffRepository[domain.Nurse],
	tokenRepo repository.TokenRepository,
	jwtManager *util.JWTManager,
) AuthService {
	return &authService{
		baseUserRepo: baseUserRepo,
		patientRepo:  patientRepo,
		doctorRepo:   doctorRepo,
		nurseRepo:    nurseRepo,
		tokenRepo:    tokenRepo,
		jwtManager:   jwtManager,
	}
}

// Login chỉ cần BaseUser để kiểm tra password và role — không cần biết Doctor hay Nurse
func (s *authService) Login(ctx context.Context, input *usecase.LoginInput) (*dto.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	u, err := s.baseUserRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if u.Status != domain.StatusActive {
		return nil, errors.New("account not activated")
	}
	if !util.ComparePassword(u.Password, input.Password) {
		return nil, errors.New("invalid credentials")
	}

	return s.issueTokens(ctx, u)
}

// Register tạo user theo đúng type dựa vào role
func (s *authService) Register(ctx context.Context, input *usecase.RegisterInput) (*dto.BaseUserInfoResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	existing, _ := s.baseUserRepo.FindByEmail(ctx, email)
	if existing != nil {
		return nil, errors.New("email already exists")
	}
	if input.Password != input.ConfirmedPassword {
		return nil, errors.New("password and confirmed password do not match")
	}

	hashedPwd, err := util.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	status := domain.StatusActive
	if input.Role == domain.RolePatient {
		status = domain.StatusInactive
	}

	base := domain.BaseUser{
		Name:     input.Name,
		Email:    email,
		Password: hashedPwd,
		Provider: LocalProvider,
		Role:     input.Role,
		Gender:   input.Gender,
		Dob:      input.Dob,
		Status:   status,
	}

	insertedBase, err := s.createUserByRole(ctx, base)
	if err != nil {
		return nil, err
	}

	if input.Role == domain.RolePatient {
		if err := s.sendActivationOTP(ctx, email, insertedBase.Name); err != nil {
			return nil, err
		}
	}

	return mapBaseUserToResponse(insertedBase), nil
}

func (s *authService) Me(ctx context.Context, input *usecase.MeInput) (*dto.BaseUserInfoResponse, error) {
	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}

	// BaseUser đủ để trả về BaseUserInfoResponse
	u, err := s.baseUserRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return mapBaseUserToResponse(u), nil
}

func (s *authService) Refresh(ctx context.Context, input *usecase.RefreshInput) (string, error) {
	claims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return "", err
	}

	tokenHash := util.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, claims.Subject, tokenHash); err != nil || !ok {
		if err != nil {
			return "", err
		}
		return "", errors.New("invalid refresh token")
	}

	userId, err := util.MustHexToObjectID(claims.Subject)
	if err != nil {
		return "", err
	}
	u, err := s.baseUserRepo.FindByID(ctx, userId)
	if err != nil {
		return "", err
	}

	return s.jwtManager.GenerateAccessToken(claims.Subject, u.Role)
}

func (s *authService) Logout(ctx context.Context, input *usecase.LogoutInput) error {
	if input.RefreshToken == "" {
		return errors.New("missing refresh token")
	}

	claims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return fmt.Errorf("invalid refresh token: %w", err)
	}

	tokenHash := util.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, claims.Subject, tokenHash); err != nil || !ok {
		return errors.New("token already revoked or invalid")
	}

	return s.tokenRepo.RevokeTokenByTokenHash(ctx, claims.Subject, tokenHash)
}

func (s *authService) GetGoogleLoginURL(state string) string {
	return config.GoogleOAuth2Conf.AuthCodeURL(state)
}

// HandleGoogleOAuth2Callback — Google OAuth luôn tạo Patient
func (s *authService) HandleGoogleOAuth2Callback(ctx context.Context, input *usecase.GoogleOAuth2Input) (*dto.LoginResponse, error) {
	if input.Code == "" {
		return nil, errors.New("missing authorization code")
	}

	token, err := config.GoogleOAuth2Conf.Exchange(ctx, input.Code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}

	client := config.GoogleOAuth2Conf.Client(ctx, token)

	userInfo, err := fetchGoogleUserInfo(client)
	if err != nil {
		return nil, err
	}
	if !userInfo.VerifiedEmail {
		return nil, errors.New("google account email not verified")
	}

	email := strings.ToLower(strings.TrimSpace(userInfo.Email))
	gender, dob := fetchGooglePeopleData(client)

	// Tìm theo BaseUser — không cần biết role cụ thể
	existing, err := s.baseUserRepo.FindByEmail(ctx, email)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	if existing == nil {
		patient := &domain.Patient{
			BaseUser: domain.BaseUser{
				Name:     userInfo.Name,
				Email:    email,
				Role:     domain.RolePatient,
				Provider: GoogleProvider,
				Gender:   gender,
				Dob:      dob,
				Status:   domain.StatusActive,
			},
		}
		inserted, err := s.patientRepo.Create(ctx, patient)
		if err != nil {
			return nil, fmt.Errorf("failed to create user from google profile: %w", err)
		}
		existing = &inserted.BaseUser
	}

	return s.issueTokens(ctx, existing)
}

func (s *authService) ForgotPassword(ctx context.Context, input *usecase.ForgotPasswordInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	u, err := s.baseUserRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil // Không lộ thông tin user tồn tại hay không
	}
	if u.Provider != LocalProvider {
		return nil
	}

	otp, err := util.GenerateNumericOTP(6)
	if err != nil {
		return fmt.Errorf("failed to generate otp: %w", err)
	}

	tokenHash := util.HashTokenSHA256(otp)
	expires := time.Now().Add(ResetPasswordTokenTTL)

	if err := s.baseUserRepo.SetResetToken(ctx, email, tokenHash, expires); err != nil {
		return err
	}

	go func() {
		if err := util.SendEmail(u.Email, constant.SubjectResetPassword,
			fmt.Sprintf(constant.ResetPasswordEmailTemplate, u.Name, otp, int(ResetPasswordTokenTTL.Minutes()))); err != nil {
			log.Printf("failed to send reset password email: %v", err)
		}
	}()

	return nil
}

func (s *authService) ResetPassword(ctx context.Context, input *usecase.ResetPasswordInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	otp := strings.TrimSpace(input.OTP)

	if email == "" {
		return errors.New("missing email")
	}
	if otp == "" {
		return errors.New("missing otp")
	}
	if input.NewPassword != input.ConfirmedNewPassword {
		return errors.New("password and confirmed password do not match")
	}

	hashedOTP := util.HashTokenSHA256(otp)
	u, err := s.baseUserRepo.FindByEmailAndResetOTP(ctx, email, hashedOTP)
	if err != nil {
		return errors.New("invalid or expired otp")
	}

	hashedPwd, err := util.HashPassword(input.NewPassword)
	if err != nil {
		return err
	}

	return s.baseUserRepo.ResetPassword(ctx, u.ID, hashedPwd)
}

func (s *authService) ActivateAccount(ctx context.Context, input *usecase.ActivateAccountInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	otp := strings.TrimSpace(input.OTP)
	if email == "" {
		return errors.New("missing email")
	}
	if otp == "" {
		return errors.New("missing otp")
	}

	hashedOTP := util.HashTokenSHA256(otp)
	u, err := s.baseUserRepo.FindByEmailAndActivationHash(ctx, email, hashedOTP)
	if err != nil {
		return errors.New("invalid or expired otp")
	}
	if u.Status == domain.StatusActive {
		return nil
	}

	return s.baseUserRepo.ActivateUserByEmail(ctx, u.Email)
}

func (s *authService) ResendActivationEmail(ctx context.Context, input *usecase.ResendActivationEmailInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	u, err := s.baseUserRepo.FindByEmail(ctx, email)
	if err != nil {
		return errors.New("user not found")
	}
	if u.Status == domain.StatusActive {
		return errors.New("account already activated")
	}

	return s.sendActivationOTP(ctx, email, u.Name)
}

// ========================================================
// =============== Private Helper Functions ===============
// ========================================================

// createUserByRole tạo đúng concrete type theo role, trả về *domain.BaseUser để dùng chung
func (s *authService) createUserByRole(ctx context.Context, base domain.BaseUser) (*domain.BaseUser, error) {
	switch base.Role {
	case domain.RolePatient:
		inserted, err := s.patientRepo.Create(ctx, &domain.Patient{BaseUser: base})
		if err != nil {
			return nil, err
		}
		return &inserted.BaseUser, nil

	case domain.RoleDoctor:
		inserted, err := s.doctorRepo.Create(ctx, &domain.Doctor{MedicalStaff: domain.MedicalStaff{BaseUser: base}})
		if err != nil {
			return nil, err
		}
		return &inserted.BaseUser, nil

	case domain.RoleNurse:
		inserted, err := s.nurseRepo.Create(ctx, &domain.Nurse{MedicalStaff: domain.MedicalStaff{BaseUser: base}})
		if err != nil {
			return nil, err
		}
		return &inserted.BaseUser, nil

	default:
		return nil, fmt.Errorf("unsupported role: %s", base.Role)
	}
}

func (s *authService) sendActivationOTP(ctx context.Context, email, name string) error {
	otp, err := util.GenerateNumericOTP(ActivationOTPLength)
	if err != nil {
		return fmt.Errorf("failed to generate activation otp: %w", err)
	}

	hashedOTP := util.HashTokenSHA256(otp)
	expires := time.Now().Add(ActivationOTPTTL)

	if err := s.baseUserRepo.SetActivationOTP(ctx, email, hashedOTP, expires); err != nil {
		return fmt.Errorf("failed to set activation otp: %w", err)
	}

	go func() {
		if err := util.SendEmail(email, constant.SubjectActivateAccount,
			fmt.Sprintf(constant.ActivateOTPEmailTemplate, name, otp, int(ActivationOTPTTL.Minutes()))); err != nil {
			log.Printf("failed to send activation email: %v", err)
		}
	}()

	return nil
}

func (s *authService) issueTokens(ctx context.Context, u *domain.BaseUser) (*dto.LoginResponse, error) {
	userIDStr := u.ID.Hex()

	if existingHash, err := s.tokenRepo.GetActiveTokenHashByUserID(ctx, userIDStr); err == nil && existingHash != "" {
		_ = s.tokenRepo.RevokeTokenByTokenHash(ctx, userIDStr, existingHash)
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(userIDStr, u.Role)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(userIDStr)
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(util.RefreshTokenTTL)
	tokenHash := util.HashTokenSHA256(refreshToken)
	if err := s.tokenRepo.Save(ctx, userIDStr, tokenHash, expiresAt); err != nil {
		return nil, err
	}

	return &dto.LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func mapBaseUserToResponse(u *domain.BaseUser) *dto.BaseUserInfoResponse {
	dob := ""
	if !u.Dob.IsZero() {
		dob = u.Dob.Format("2006-01-02")
	}

	createdAt := ""
	if !u.CreatedAt.IsZero() {
		createdAt = u.CreatedAt.Format(time.RFC3339)
	}

	updatedAt := ""
	if !u.UpdatedAt.IsZero() {
		updatedAt = u.UpdatedAt.Format(time.RFC3339)
	}

	return &dto.BaseUserInfoResponse{
		ID:           u.ID.Hex(),
		UserPublicID: u.UserPublicID,
		Name:         u.Name,
		Email:        u.Email,
		Provider:     u.Provider,
		Role:         u.Role,
		Gender:       u.Gender,
		Dob:          dob,
		Phone:        u.Phone,
		AvatarUrl:    u.AvatarUrl,
		Status:       u.Status,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	}
}

// ========================================================
// =============== Google OAuth2 Helpers ==================
// ========================================================

type googleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

type googlePeopleData struct {
	Genders []struct {
		Value string `json:"value"`
	} `json:"genders"`
	Birthdays []struct {
		Date struct {
			Year  int `json:"year"`
			Month int `json:"month"`
			Day   int `json:"day"`
		} `json:"date"`
	} `json:"birthdays"`
}

func fetchGoogleUserInfo(client *http.Client) (*googleUserInfo, error) {
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user info from Google: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code from Google API: %d", resp.StatusCode)
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}
	return &info, nil
}

func fetchGooglePeopleData(client *http.Client) (domain.Gender, time.Time) {
	var gender domain.Gender
	var dob time.Time

	resp, err := client.Get("https://people.googleapis.com/v1/people/me?personFields=birthdays,genders")
	if err != nil || resp.StatusCode != http.StatusOK {
		return gender, dob
	}
	defer resp.Body.Close()

	var data googlePeopleData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return gender, dob
	}

	if len(data.Genders) > 0 {
		switch strings.ToLower(data.Genders[0].Value) {
		case "male":
			gender = domain.GenderMale
		case "female":
			gender = domain.GenderFemale
		default:
			gender = domain.GenderOther
		}
	}

	if len(data.Birthdays) > 0 {
		bd := data.Birthdays[0].Date
		if bd.Year > 0 && bd.Month > 0 && bd.Day > 0 {
			dob = time.Date(bd.Year, time.Month(bd.Month), bd.Day, 0, 0, 0, 0, time.UTC)
		}
	}

	return gender, dob
}
