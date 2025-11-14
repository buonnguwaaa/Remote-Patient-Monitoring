package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecases"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"go.mongodb.org/mongo-driver/mongo"
	"net/http"
	"strings"
	"time"
)

const (
	LocalProvider  = "local"
	GoogleProvider = "google"
)

type authService struct {
	userRepo   repositories.UserRepository
	tokenRepo  repositories.TokenRepository
	jwtManager *utils.JWTManager
}

type AuthService interface {
	Login(ctx context.Context, input *usecases.LoginInput) (*dto.LoginResponse, error)
	Register(ctx context.Context, input *usecases.RegisterInput) (*dto.UserResponse, error)
	Me(ctx context.Context, input *usecases.MeInput) (*dto.UserResponse, error)
	Refresh(ctx context.Context, input *usecases.RefreshInput) (string, error)
	Logout(ctx context.Context, input *usecases.LogoutInput) error
	GetGoogleLoginURL(state string) string
	HandleGoogleOAuth2Callback(ctx context.Context, input *usecases.GoogleOAuth2Input) (*dto.LoginResponse, error)
}

func NewAuthService(userRepo repositories.UserRepository, tokenRepo repositories.TokenRepository, jwtManager *utils.JWTManager) AuthService {
	return &authService{
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
		jwtManager: jwtManager,
	}
}

func (s *authService) Login(ctx context.Context, input *usecases.LoginInput) (*dto.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	u, err := s.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !utils.ComparePassword(u.Password, input.Password) {
		return nil, errors.New("invalid credentials")
	}

	return s.issueTokens(ctx, u)
}

func (s *authService) Register(ctx context.Context, input *usecases.RegisterInput) (*dto.UserResponse, error) {
	email := strings.ToLower(strings.TrimSpace(input.Email))
	existing, _ := s.userRepo.FindByEmail(ctx, email)
	if existing != nil {
		return nil, errors.New("email already exists")
	}

	if input.Password != input.ConfirmedPassword {
		return nil, errors.New("password and confirmed password do not match")
	}
	hashedPwd, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}
	u := &users.User{
		Name:     input.Name,
		Email:    email,
		Password: hashedPwd,
		Provider: LocalProvider,
		Role:     input.Role,
		Gender:   input.Gender,
		Dob:      input.Dob,
	}
	insertedUser, err := s.userRepo.Create(ctx, u)
	if err != nil {
		return nil, err
	}
	return &dto.UserResponse{
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

func (s *authService) Me(ctx context.Context, input *usecases.MeInput) (*dto.UserResponse, error) {
	u, err := s.userRepo.FindByID(ctx, utils.MustHexToObjectID(input.UserID))
	if err != nil {
		return nil, err
	}
	return &dto.UserResponse{
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

func (s *authService) Refresh(ctx context.Context, input *usecases.RefreshInput) (string, error) {
	refreshTokenClaims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return "", err
	}

	tokenHash := utils.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, refreshTokenClaims.Subject, tokenHash); err != nil || !ok {
		if err != nil {
			return "", err
		}
		return "", errors.New("invalid refresh token")
	}

	user, err := s.userRepo.FindByID(ctx, utils.MustHexToObjectID(refreshTokenClaims.Subject))
	if err != nil {
		return "", err
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(refreshTokenClaims.Subject, user.Role)
	if err != nil {
		return "", err
	}

	return accessToken, nil
}

func (s *authService) Logout(ctx context.Context, input *usecases.LogoutInput) error {
	if input.RefreshToken == "" {
		return errors.New("missing refresh token")
	}
	refreshTokenClaims, err := s.jwtManager.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return fmt.Errorf("invalid refresh token: %w", err)
	}

	tokenHash := utils.HashTokenSHA256(input.RefreshToken)
	if ok, err := s.tokenRepo.IsValid(ctx, refreshTokenClaims.Subject, tokenHash); err != nil || !ok {
		return fmt.Errorf("token already revoked or invalid")
	}

	// TODO: Blacklist the access token to enhance
	return s.tokenRepo.RevokeToken(ctx, refreshTokenClaims.Subject, tokenHash)
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

func (s *authService) HandleGoogleOAuth2Callback(ctx context.Context, input *usecases.GoogleOAuth2Input) (*dto.LoginResponse, error) {
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

	var gender users.Gender
	var dob time.Time
	peopleResp, err := client.Get("https://people.googleapis.com/v1/people/me?personFields=birthdays,genders")
	if err == nil && peopleResp.StatusCode == http.StatusOK {
		defer peopleResp.Body.Close()
		var peopleData googlePeopleData
		if err := json.NewDecoder(peopleResp.Body).Decode(&peopleData); err == nil {
			if len(peopleData.Genders) > 0 {
				switch strings.ToLower(peopleData.Genders[0].Value) {
				case "male":
					gender = users.GenderMale
				case "female":
					gender = users.GenderFemale
				case "unspecified", "other":
					gender = users.GenderOther
				default:
					gender = users.GenderOther
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

		newUser := &users.User{
			Name:     userInfo.Name,
			Email:    email,
			Role:     users.RolePatient,
			Provider: GoogleProvider,
			Gender:   gender,
			Dob:      dob,
		}
		u, err = s.userRepo.Create(ctx, newUser)
		if err != nil {
			return nil, fmt.Errorf("failed to create user from google profile: %w", err)
		}
	}

	return s.issueTokens(ctx, u)
}

func (s *authService) issueTokens(ctx context.Context, u *users.User) (*dto.LoginResponse, error) {
	accessToken, err := s.jwtManager.GenerateAccessToken(u.ID.Hex(), u.Role)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(u.ID.Hex())
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(utils.RefreshTokenTTL)
	tokenHash := utils.HashTokenSHA256(refreshToken)
	if err := s.tokenRepo.Save(ctx, u.ID.Hex(), tokenHash, expiresAt); err != nil {
		return nil, err
	}

	return &dto.LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}
