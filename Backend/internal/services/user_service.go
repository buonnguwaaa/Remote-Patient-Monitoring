package services

import (
	"context"
	"fmt"
	"os"
	"time"

	ntmodel "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/notification_tokens"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// Đăng ký user mới
func RegisterUser(ctx context.Context, req *users.User) error {
	// Kiểm tra email đã tồn tại
	foundUser, err := repositories.FindUserByEmail(ctx, req.Email)
	if err == nil && foundUser != nil {
		return fmt.Errorf("email already exists")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	req.Password = string(hash)
	if err := repositories.CreateUser(ctx, req); err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// Đăng nhập, trả về accessToken, refreshToken, user
func LoginUser(ctx context.Context, email, password string) (string, string, *users.User, error) {
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	user, err := repositories.FindUserByEmail(ctx, email)
	if err != nil {
		return "", "", nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		return "", "", nil, err
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 1).Unix(),
	})
	accessTokenString, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", nil, err
	}
	// Xóa hết refresh token cũ của user
	_ = repositories.DeleteRefreshTokensByUserID(ctx, user.ID)
	refreshTokenExp := time.Now().Add(time.Hour * 24 * 7)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email":   user.Email,
		"role":    user.Role,
		"exp":     refreshTokenExp.Unix(),
	})
	refreshTokenString, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", nil, err
	}
	err = repositories.SaveRefreshToken(ctx, &ntmodel.NotificationToken{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: refreshTokenExp,
	})
	if err != nil {
		return "", "", nil, err
	}
	return accessTokenString, refreshTokenString, user, nil
}

// Xử lý refresh token
type RefreshResult struct {
	AccessToken string
	Err         error
}

func HandleRefreshToken(ctx context.Context, refreshToken string) RefreshResult {
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))

	doc, err := repositories.FindRefreshToken(ctx, refreshToken)
	if err != nil {
		logrus.WithError(err).Warn("refresh token not found in DB")
		return RefreshResult{"", err}
	}
	if time.Now().After(doc.ExpiresAt) {
		_ = repositories.DeleteRefreshToken(ctx, refreshToken)
		logrus.WithField("expired_at", doc.ExpiresAt).Warn("refresh token expired")
		return RefreshResult{"", err}
	}

	claims := jwt.MapClaims{}
	_, err = jwt.ParseWithClaims(refreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		logrus.WithError(err).Warn("failed to parse refresh token JWT")
		return RefreshResult{"", err}
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		logrus.Warn("refresh token missing user_id claim")
		return RefreshResult{"", err}
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"email":   claims["email"],
		"role":    claims["role"],
		"exp":     time.Now().Add(time.Hour * 1).Unix(),
	})
	accessTokenString, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		return RefreshResult{"", err}
	}

	return RefreshResult{accessTokenString, nil}
}

// RefreshToken struct moved to internal/domains/auth to avoid import cycles
