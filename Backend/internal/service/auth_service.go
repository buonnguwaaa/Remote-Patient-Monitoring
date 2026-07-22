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
	VerifyResetOTP(ctx context.Context, email, otp string) error
	ResetPassword(ctx context.Context, input *usecase.ResetPasswordInput) error
}

type authService struct {
	baseUserRepo    userRepository.BaseUserRepository
	patientRepo     userRepository.PatientRepository
	tokenRepo       repository.TokenRepository
	blacklistRepo   repository.TokenBlacklistRepository
	jwtManager      *util.JWTManager
	accountNotifier AccountNotifier
}

func NewAuthService(
	baseUserRepo userRepository.BaseUserRepository,
	patientRepo userRepository.PatientRepository,
	tokenRepo repository.TokenRepository,
	blacklistRepo repository.TokenBlacklistRepository,
	jwtManager *util.JWTManager,
	accountNotifier AccountNotifier,
) AuthService {
	return &authService{
		baseUserRepo:    baseUserRepo,
		patientRepo:     patientRepo,
		tokenRepo:       tokenRepo,
		blacklistRepo:   blacklistRepo,
		jwtManager:      jwtManager,
		accountNotifier: accountNotifier,
	}
}

// Login chỉ cần BaseUser để kiểm tra password và role — không cần biết Doctor hay Nurse
func (s *authService) Login(ctx context.Context, input *usecase.LoginInput) (*dto.LoginResponse, error) {
	identifier := strings.TrimSpace(input.Identifier)
	if identifier == "" {
		return nil, errors.New("Email hoặc số điện thoại là bắt buộc")
	}

	var u *domain.BaseUser
	var err error
	if strings.Contains(identifier, "@") {
		u, err = s.baseUserRepo.FindByEmail(ctx, strings.ToLower(identifier))
	} else {
		phoneHash, hashErr := util.HashPhoneForLookup(identifier)
		if hashErr != nil {
			return nil, hashErr
		}
		u, err = s.baseUserRepo.FindByPhoneLookupHash(ctx, phoneHash)
	}
	if err != nil {
		return nil, errors.New("Thông tin đăng nhập hoặc mật khẩu không đúng")
	}
	if u.Status != domain.StatusActive {
		return nil, errors.New("Tài khoản đang chờ quản trị viên xác minh")
	}
	if !util.ComparePassword(u.Password, input.Password) {
		return nil, errors.New("Thông tin đăng nhập hoặc mật khẩu không đúng")
	}

	return s.issueTokens(ctx, u)
}

// Register is public self-registration and always creates an inactive patient.
func (s *authService) Register(ctx context.Context, input *usecase.RegisterInput) (*dto.BaseUserInfoResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	profile := &usecase.UpdatePatientProfileInput{
		Name:                      input.Name,
		Phone:                     input.Phone,
		PatientProfileFieldsInput: input.PatientProfileFieldsInput,
	}
	if err := validatePatientProfileUpdate(profile); err != nil {
		return nil, err
	}
	phone := profile.Phone
	if email == "" && phone == "" {
		return nil, errors.New("Email hoặc số điện thoại là bắt buộc")
	}

	if err := s.ensureContactsAvailable(ctx, email, phone); err != nil {
		return nil, err
	}
	if input.Password != input.ConfirmedPassword {
		return nil, errors.New("Mật khẩu và mật khẩu xác nhận không khớp")
	}

	hashedPwd, err := util.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	phoneHash, err := util.HashPhoneForLookup(phone)
	if err != nil {
		return nil, err
	}

	base := domain.BaseUser{
		Name:            profile.Name,
		Email:           email,
		Phone:           phone,
		PhoneLookupHash: phoneHash,
		Password:        hashedPwd,
		Provider:        LocalProvider,
		Role:            domain.RolePatient,
		Gender:          input.Gender,
		Dob:             input.Dob,
		Status:          domain.StatusInactive,
	}

	patient := &domain.Patient{
		BaseUser:              base,
		InsuranceNumber:       profile.InsuranceNumber,
		CCCD:                  profile.CCCD,
		EmergencyContactName:  profile.EmergencyContactName,
		EmergencyContactPhone: profile.EmergencyContactPhone,
		MedicalHistory:        profile.MedicalHistory,
	}
	if profile.DiseaseTypes != nil {
		patient.DiseaseTypes = *profile.DiseaseTypes
	}

	inserted, err := s.patientRepo.Create(ctx, patient)
	if err != nil {
		return nil, err
	}

	if s.accountNotifier != nil {
		if err := s.accountNotifier.NotifyAdminsPatientRegistered(ctx, inserted); err != nil {
			log.Printf("[WARN] failed to notify admins about patient %s: %v", inserted.ID.Hex(), err)
		}
	}

	return mapBaseUserToResponse(&inserted.BaseUser), nil
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
		return "", errors.New("Token làm mới không hợp lệ")
	}

	userId, err := util.MustHexToObjectID(claims.Subject)
	if err != nil {
		return "", err
	}
	u, err := s.baseUserRepo.FindByID(ctx, userId)
	if err != nil {
		return "", err
	}
	if u.Status != domain.StatusActive {
		return "", errors.New("Tài khoản không hoạt động")
	}

	return s.jwtManager.GenerateAccessToken(claims.Subject, u.Role)
}

func (s *authService) Logout(ctx context.Context, input *usecase.LogoutInput) error {
	if input.RefreshToken == "" {
		return errors.New("Thiếu token làm mới")
	}

	claims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return fmt.Errorf("token làm mới không hợp lệ: %w", err)
	}

	tokenHash := util.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, claims.Subject, tokenHash); err != nil || !ok {
		return errors.New("Token đã bị thu hồi hoặc không hợp lệ")
	}

	// Blacklist access token first so a partial failure still blocks API use.
	if input.AccessJTI != "" && s.blacklistRepo != nil {
		expiresAt := input.AccessExp
		if expiresAt.IsZero() {
			expiresAt = time.Now().UTC().Add(util.AccessTokenTTL)
		}
		if err := s.blacklistRepo.BlacklistJTI(ctx, input.AccessJTI, expiresAt); err != nil {
			return fmt.Errorf("không thể thu hồi token truy cập: %w", err)
		}
	}

	return s.tokenRepo.RevokeTokenByTokenHash(ctx, claims.Subject, tokenHash)
}

func (s *authService) GetGoogleLoginURL(state string) string {
	return config.GoogleOAuth2Conf.AuthCodeURL(state)
}

// HandleGoogleOAuth2Callback — Google OAuth luôn tạo Patient
func (s *authService) HandleGoogleOAuth2Callback(ctx context.Context, input *usecase.GoogleOAuth2Input) (*dto.LoginResponse, error) {
	if input.Code == "" {
		return nil, errors.New("Thiếu mã xác thực")
	}

	token, err := config.GoogleOAuth2Conf.Exchange(ctx, input.Code)
	if err != nil {
		return nil, fmt.Errorf("không thể đổi mã xác thực lấy token: %w", err)
	}

	client := config.GoogleOAuth2Conf.Client(ctx, token)

	userInfo, err := fetchGoogleUserInfo(client)
	if err != nil {
		return nil, err
	}
	if !userInfo.VerifiedEmail {
		return nil, errors.New("Email tài khoản Google chưa được xác minh")
	}

	email := strings.ToLower(strings.TrimSpace(userInfo.Email))
	gender, dob := fetchGooglePeopleData(client)

	// Tìm theo BaseUser — không cần biết role cụ thể
	existing, err := s.baseUserRepo.FindByEmail(ctx, email)
	if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, fmt.Errorf("không thể tìm người dùng: %w", err)
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
				Status:   domain.StatusInactive,
			},
		}
		inserted, err := s.patientRepo.Create(ctx, patient)
		if err != nil {
			return nil, fmt.Errorf("không thể tạo người dùng từ hồ sơ Google: %w", err)
		}
		existing = &inserted.BaseUser
		if s.accountNotifier != nil {
			if err := s.accountNotifier.NotifyAdminsPatientRegistered(ctx, inserted); err != nil {
				log.Printf("[WARN] failed to notify admins about Google patient %s: %v", inserted.ID.Hex(), err)
			}
		}
	}
	if existing.Status != domain.StatusActive {
		return nil, errors.New("Tài khoản đang chờ quản trị viên xác minh")
	}

	return s.issueTokens(ctx, existing)
}

func (s *authService) ForgotPassword(ctx context.Context, input *usecase.ForgotPasswordInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	u, err := s.baseUserRepo.FindByEmail(ctx, email)
	if err != nil {
		return errors.New("Email không tồn tại trong hệ thống")
	}
	if u.Provider != LocalProvider {
		return fmt.Errorf("Tài khoản được đăng ký qua %s, không thể đặt lại mật khẩu", u.Provider)
	}

	otp, err := util.GenerateNumericOTP(6)
	if err != nil {
		return fmt.Errorf("không thể tạo mã OTP: %w", err)
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

func (s *authService) VerifyResetOTP(ctx context.Context, email, otp string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	otp = strings.TrimSpace(otp)

	if email == "" {
		return errors.New("Thiếu email")
	}
	if otp == "" {
		return errors.New("Thiếu mã OTP")
	}

	hashedOTP := util.HashTokenSHA256(otp)
	_, err := s.baseUserRepo.FindByEmailAndResetOTP(ctx, email, hashedOTP)
	if err != nil {
		return errors.New("Mã OTP không hợp lệ hoặc đã hết hạn")
	}
	return nil
}

func (s *authService) ResetPassword(ctx context.Context, input *usecase.ResetPasswordInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	otp := strings.TrimSpace(input.OTP)

	if email == "" {
		return errors.New("Thiếu email")
	}
	if otp == "" {
		return errors.New("Thiếu mã OTP")
	}
	if input.NewPassword != input.ConfirmedNewPassword {
		return errors.New("Mật khẩu và mật khẩu xác nhận không khớp")
	}

	hashedOTP := util.HashTokenSHA256(otp)
	u, err := s.baseUserRepo.FindByEmailAndResetOTP(ctx, email, hashedOTP)
	if err != nil {
		return errors.New("Mã OTP không hợp lệ hoặc đã hết hạn")
	}

	hashedPwd, err := util.HashPassword(input.NewPassword)
	if err != nil {
		return err
	}

	if err := s.baseUserRepo.ResetPassword(ctx, u.ID, hashedPwd); err != nil {
		return err
	}

	userIDStr := u.ID.Hex()
	_ = s.tokenRepo.RevokeAllByUserID(ctx, userIDStr)
	if s.blacklistRepo != nil {
		_ = s.blacklistRepo.InvalidateUserTokensIssuedBefore(ctx, userIDStr, time.Now().UTC(), util.AccessTokenTTL)
	}
	return nil
}

// ========================================================
// =============== Private Helper Functions ===============
// ========================================================

func (s *authService) ensureContactsAvailable(ctx context.Context, email, phone string) error {
	if email != "" {
		if existing, err := s.baseUserRepo.FindByEmail(ctx, email); err == nil && existing != nil {
			return errors.New("Email đã tồn tại")
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
			return errors.New("Số điện thoại đã tồn tại")
		} else if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
			return err
		}
	}
	return nil
}

func (s *authService) issueTokens(ctx context.Context, u *domain.BaseUser) (*dto.LoginResponse, error) {
	userIDStr := u.ID.Hex()
	now := time.Now().UTC()

	if err := s.tokenRepo.RevokeAllByUserID(ctx, userIDStr); err != nil {
		return nil, err
	}
	if s.blacklistRepo != nil {
		if err := s.blacklistRepo.InvalidateUserTokensIssuedBefore(ctx, userIDStr, now, util.AccessTokenTTL); err != nil {
			return nil, fmt.Errorf("không thể vô hiệu hóa phiên cũ: %w", err)
		}
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
		return nil, fmt.Errorf("không thể lấy thông tin người dùng từ Google: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Mã phản hồi từ Google API không mong đợi: %d", resp.StatusCode)
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("không thể phân tích thông tin người dùng từ Google: %w", err)
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
