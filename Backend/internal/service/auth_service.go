package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	LocalProvider  = "local"
	GoogleProvider = "google"

	ActivationTokenTTL    = 24 * time.Hour
	ResetPasswordTokenTTL = 15 * time.Minute
)

type authService struct {
	userRepo   repository.UserRepository
	tokenRepo  repository.TokenRepository
	jwtManager *util.JWTManager
}

type AuthService interface {
	Login(ctx context.Context, input *usecase.LoginInput) (*dto.LoginResponse, error)
	Register(ctx context.Context, input *usecase.RegisterInput) (*dto.UserInfoResponse, error)
	Me(ctx context.Context, input *usecase.MeInput) (*dto.UserInfoResponse, error)
	Refresh(ctx context.Context, input *usecase.RefreshInput) (string, error)
	Logout(ctx context.Context, input *usecase.LogoutInput) error
	GetGoogleLoginURL(state string) string
	HandleGoogleOAuth2Callback(ctx context.Context, input *usecase.GoogleOAuth2Input) (*dto.LoginResponse, error)
	ForgotPassword(ctx context.Context, input *usecase.ForgotPasswordInput) error
	ResetPassword(ctx context.Context, input *usecase.ResetPasswordInput) error
	ActivateAccount(ctx context.Context, input *usecase.ActivateAccountInput) error
	ResendActivationEmail(ctx context.Context, input *usecase.ResendActivationEmailInput) error
}

func NewAuthService(userRepo repository.UserRepository, tokenRepo repository.TokenRepository, jwtManager *util.JWTManager) AuthService {
	return &authService{
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
		jwtManager: jwtManager,
	}
}

func (s *authService) Login(ctx context.Context, input *usecase.LoginInput) (*dto.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	u, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !u.IsActive {
		return nil, errors.New("account not activated")
	}

	if !util.ComparePassword(u.Password, input.Password) {
		return nil, errors.New("invalid credentials")
	}

	return s.issueTokens(ctx, u)
}

func (s *authService) Register(ctx context.Context, input *usecase.RegisterInput) (*dto.UserInfoResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	existing, _ := s.userRepo.FindByEmail(ctx, email)
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
	u := &domain.User{
		Name:     input.Name,
		Email:    email,
		Password: hashedPwd,
		Provider: LocalProvider,
		Role:     input.Role,
		Gender:   input.Gender,
		Dob:      input.Dob,
		IsActive: input.Role == domain.RolePatient,
	}
	insertedUser, err := s.userRepo.Create(ctx, u)
	if err != nil {
		return nil, err
	}

	token, err := util.GenerateRandomToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate activation token: %w", err)
	}
	hashedToken := util.HashTokenSHA256(token)
	expires := time.Now().Add(ActivationTokenTTL)

	if err := s.userRepo.SetActivationToken(ctx, email, hashedToken, expires); err != nil {
		return nil, fmt.Errorf("failed to set activation token: %w", err)
	}

	activateURI := fmt.Sprintf("%s/activate?token=%s", os.Getenv("FE_URL"), token)
	activateEmailSubject := constant.SubjectActivateAccount
	activateEmailBody := fmt.Sprintf(constant.ActivateEmailTemplate, insertedUser.Name, activateURI)
	go util.SendEmail(insertedUser.Email, activateEmailSubject, activateEmailBody)

	return &dto.UserInfoResponse{
		ID:        insertedUser.ID.Hex(),
		Name:      insertedUser.Name,
		Email:     insertedUser.Email,
		Provider:  insertedUser.Provider,
		Role:      insertedUser.Role,
		Gender:    insertedUser.Gender,
		Dob:       insertedUser.Dob.Format("2006-01-02"),
		CreatedAt: insertedUser.CreatedAt.Format(time.RFC3339),
		UpdatedAt: insertedUser.UpdatedAt.Format(time.RFC3339),
	}, nil
}

func (s *authService) Me(ctx context.Context, input *usecase.MeInput) (*dto.UserInfoResponse, error) {
	userId, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}

	u, err := s.userRepo.FindByID(ctx, userId)
	if err != nil {
		return nil, err
	}
	return &dto.UserInfoResponse{
		ID:        u.ID.Hex(),
		Name:      u.Name,
		Email:     u.Email,
		Role:      u.Role,
		Gender:    u.Gender,
		Dob:       u.Dob.Format("2006-01-02"),
		CreatedAt: u.CreatedAt.Format(time.RFC3339),
		UpdatedAt: u.UpdatedAt.Format(time.RFC3339),
	}, nil
}

func (s *authService) Refresh(ctx context.Context, input *usecase.RefreshInput) (string, error) {
	refreshTokenClaims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return "", err
	}

	tokenHash := util.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, refreshTokenClaims.Subject, tokenHash); err != nil || !ok {
		if err != nil {
			return "", err
		}
		return "", errors.New("invalid refresh token")
	}

	userId, err := util.MustHexToObjectID(refreshTokenClaims.Subject)
	if err != nil {
		return "", err
	}

	user, err := s.userRepo.FindByID(ctx, userId)
	if err != nil {
		return "", err
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(refreshTokenClaims.Subject, user.Role)
	if err != nil {
		return "", err
	}

	return accessToken, nil
}

func (s *authService) Logout(ctx context.Context, input *usecase.LogoutInput) error {
	if input.RefreshToken == "" {
		return errors.New("missing refresh token")
	}
	refreshTokenClaims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return fmt.Errorf("invalid refresh token: %w", err)
	}

	tokenHash := util.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, refreshTokenClaims.Subject, tokenHash); err != nil || !ok {
		return fmt.Errorf("token already revoked or invalid")
	}

	// TODO: Blacklist the access token to enhance
	return s.tokenRepo.RevokeTokenByTokenHash(ctx, refreshTokenClaims.Subject, tokenHash)
}

func (s *authService) GetGoogleLoginURL(state string) string {
	return config.GoogleOAuth2Conf.AuthCodeURL(state)
}

// googleUserInfo represents the user info from Google OAuth2 userinfo API
type googleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// googlePeopleData represents the data from Google People API
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

func (s *authService) HandleGoogleOAuth2Callback(ctx context.Context, input *usecase.GoogleOAuth2Input) (*dto.LoginResponse, error) {
	if input.Code == "" {
		return nil, errors.New("missing authorization code")
	}

	token, err := config.GoogleOAuth2Conf.Exchange(ctx, input.Code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}

	client := config.GoogleOAuth2Conf.Client(ctx, token)

	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user info from Google: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code from Google API: %d", resp.StatusCode)
	}

	var userInfo googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}

	if !userInfo.VerifiedEmail {
		return nil, errors.New("google account email not verified")
	}

	email := strings.ToLower(strings.TrimSpace(userInfo.Email))

	var gender domain.Gender
	var dob time.Time
	peopleResp, err := client.Get("https://people.googleapis.com/v1/people/me?personFields=birthdays,genders")
	if err == nil && peopleResp.StatusCode == http.StatusOK {
		defer peopleResp.Body.Close()
		var peopleData googlePeopleData
		if err := json.NewDecoder(peopleResp.Body).Decode(&peopleData); err == nil {
			if len(peopleData.Genders) > 0 {
				switch strings.ToLower(peopleData.Genders[0].Value) {
				case "male":
					gender = domain.GenderMale
				case "female":
					gender = domain.GenderFemale
				case "unspecified", "other":
					gender = domain.GenderOther
				default:
					gender = domain.GenderOther
				}
			}

			if len(peopleData.Birthdays) > 0 {
				bd := peopleData.Birthdays[0].Date
				if bd.Year > 0 && bd.Month > 0 && bd.Day > 0 {
					dob = time.Date(bd.Year, time.Month(bd.Month), bd.Day, 0, 0, 0, 0, time.UTC)
				}
			}
		}
	}

	u, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		if !errors.Is(err, mongo.ErrNoDocuments) {
			return nil, fmt.Errorf("failed to find user: %w", err)
		}

		newUser := &domain.User{
			Name:     userInfo.Name,
			Email:    email,
			Role:     domain.RolePatient,
			Provider: GoogleProvider,
			Gender:   gender,
			Dob:      dob,
			IsActive: true,
		}
		u, err = s.userRepo.Create(ctx, newUser)
		if err != nil {
			return nil, fmt.Errorf("failed to create user from google profile: %w", err)
		}
	}

	return s.issueTokens(ctx, u)
}

func (s *authService) ForgotPassword(ctx context.Context, input *usecase.ForgotPasswordInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	user, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil
	}

	if user.Provider != LocalProvider {
		return nil
	}

	token, err := util.GenerateRandomToken(32)
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}
	tokenHash := util.HashTokenSHA256(token)
	expires := time.Now().Add(ResetPasswordTokenTTL)

	if err := s.userRepo.SetResetToken(ctx, email, tokenHash, expires); err != nil {
		return err
	}

	resetURI := fmt.Sprintf("%s/reset-password?token=%s", os.Getenv("FE_URL"), token)
	resetEmailSubject := constant.SubjectResetPassword
	resetEmailBody := fmt.Sprintf(constant.ResetPasswordEmailTemplate, user.Name, resetURI)
	go util.SendEmail(user.Email, resetEmailSubject, resetEmailBody)

	return nil
}

func (s *authService) ResetPassword(ctx context.Context, input *usecase.ResetPasswordInput) error {
	if strings.TrimSpace(input.Token) == "" {
		return errors.New("missing token")
	}

	if input.NewPassword != input.ConfirmedNewPassword {
		return errors.New("password and confirmed password do not match")
	}

	hashedToken := util.HashTokenSHA256(input.Token)
	u, err := s.userRepo.FindByResetToken(ctx, hashedToken)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	hashedPwd, err := util.HashPassword(input.NewPassword)
	if err != nil {
		return err
	}

	if err := s.userRepo.ResetPassword(ctx, u.ID, hashedPwd); err != nil {
		return err
	}

	_ = s.userRepo.SetResetToken(ctx, u.Email, "", time.Time{})

	return nil
}

func (s *authService) ActivateAccount(ctx context.Context, input *usecase.ActivateAccountInput) error {
	token := input.Token
	if strings.TrimSpace(token) == "" {
		return errors.New("missing token")
	}

	hashedToken := util.HashTokenSHA256(token)
	u, err := s.userRepo.FindByActivationHash(ctx, hashedToken)
	if err != nil {
		return errors.New("invalid or expired token")
	}

	if u.IsActive {
		return nil
	}

	if err := s.userRepo.ActivateUserByEmail(ctx, u.Email); err != nil {
		return err
	}

	return nil
}

func (s *authService) ResendActivationEmail(ctx context.Context, input *usecase.ResendActivationEmailInput) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	u, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return errors.New("user not found")
	}

	if u.IsActive {
		return errors.New("account already activated")
	}

	token, err := util.GenerateRandomToken(32)
	if err != nil {
		return fmt.Errorf("failed to generate activation token: %w", err)
	}
	hashedToken := util.HashTokenSHA256(token)
	expires := time.Now().Add(ActivationTokenTTL)

	if err := s.userRepo.SetActivationToken(ctx, email, hashedToken, expires); err != nil {
		return fmt.Errorf("failed to set activation token: %w", err)
	}

	activateURI := fmt.Sprintf("%s/activate?token=%s", os.Getenv("FE_URL"), token)
	activateEmailSubject := constant.SubjectActivateAccount
	activateEmailBody := fmt.Sprintf(constant.ActivateEmailTemplate, u.Name, activateURI)
	go util.SendEmail(u.Email, activateEmailSubject, activateEmailBody)

	return nil
}

// ========================================================
// =============== Private Helper Functions ===============
// ========================================================
func (s *authService) issueTokens(ctx context.Context, u *domain.User) (*dto.LoginResponse, error) {
	existingTokenHash, err := s.tokenRepo.GetActiveTokenHashByUserID(ctx, u.ID.Hex())
	if err == nil && existingTokenHash != "" {
		_ = s.tokenRepo.RevokeTokenByTokenHash(ctx, u.ID.Hex(), existingTokenHash)
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(u.ID.Hex(), u.Role)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(u.ID.Hex())
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(util.RefreshTokenTTL)
	tokenHash := util.HashTokenSHA256(refreshToken)
	if err := s.tokenRepo.Save(ctx, u.ID.Hex(), tokenHash, expiresAt); err != nil {
		return nil, err
	}

	return &dto.LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}
