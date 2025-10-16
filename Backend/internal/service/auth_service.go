
package service

import (
	"context"
	"time"
	"os"
	"fmt"
	"RPM-Backend/internal/api/model"
	"RPM-Backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Đăng ký user mới
func RegisterUser(ctx context.Context, req *model.User) error {
	// Kiểm tra email đã tồn tại
	foundUser, err := repository.FindUserByEmail(ctx, req.Email)
	if err == nil && foundUser != nil {
		return fmt.Errorf("email already exists")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	req.Password = string(hash)
	if err := repository.CreateUser(ctx, req); err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// Đăng nhập, trả về accessToken, refreshToken, user
func LoginUser(ctx context.Context, email, password string) (string, string, *model.User, error) {
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	user, err := repository.FindUserByEmail(ctx, email)
	if err != nil {
		return "", "", nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) != nil {
		return "", "", nil, err
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"email": user.Email,
		"role": user.Role,
		"exp": time.Now().Add(time.Hour * 1).Unix(),
	})
	accessTokenString, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", nil, err
	}
	// Xóa hết refresh token cũ của user
	_ = repository.DeleteRefreshTokensByUserID(ctx, user.ID)
	refreshTokenExp := time.Now().Add(time.Hour * 24 * 7)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.Hex(),
		"exp": refreshTokenExp.Unix(),
	})
	refreshTokenString, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", nil, err
	}
	err = repository.SaveRefreshToken(ctx, &model.RefreshToken{
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

	doc, err := repository.FindRefreshToken(ctx, refreshToken)
	if err != nil {
		return RefreshResult{"", err}
	}
	if time.Now().After(doc.ExpiresAt) {
		_ = repository.DeleteRefreshToken(ctx, refreshToken)
		return RefreshResult{"", err}
	}

	claims := jwt.MapClaims{}
	_, err = jwt.ParseWithClaims(refreshToken, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
	if err != nil {
		return RefreshResult{"", err}
	}

	userID, ok := claims["user_id"].(string)
	if !ok {
		return RefreshResult{"", err}
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"email":   claims["email"],
		"role":    claims["role"],
		"exp":    time.Now().Add(time.Hour * 1).Unix(),
	})
	accessTokenString, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		return RefreshResult{"", err}
	}

	return RefreshResult{accessTokenString, nil}
}