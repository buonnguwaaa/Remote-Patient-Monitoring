package util

import (
	"errors"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	AccessTokenTTL  = 15 * time.Minute
	RefreshTokenTTL = 30 * 24 * time.Hour
)

type JWTManager struct {
	accessTokenSecretKey  string
	refreshTokenSecretKey string
	accessTokenTTL        time.Duration
	refreshTokenTTL       time.Duration
}

func NewJWTManager(secret string) *JWTManager {
	return &JWTManager{
		accessTokenSecretKey:  secret,
		refreshTokenSecretKey: secret,
		accessTokenTTL:        AccessTokenTTL,
		refreshTokenTTL:       RefreshTokenTTL,
	}
}

type Claims struct {
	Role domain.Role `json:"role"`
	jwt.RegisteredClaims
}

func (m *JWTManager) GenerateAccessToken(userID string, role domain.Role) (string, error) {
	now := time.Now().UTC()
	claims := &Claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.NewString(),
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(m.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.accessTokenSecretKey))
}

func (m *JWTManager) GenerateRefreshToken(userID string) (string, error) {
	now := time.Now().UTC()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.NewString(),
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(now.Add(m.refreshTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.refreshTokenSecretKey))
}

func (m *JWTManager) VerifyAccessToken(strToken string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(strToken, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(m.accessTokenSecretKey), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.ID == "" {
		return nil, errors.New("missing token id")
	}
	return claims, nil
}

func (m *JWTManager) VerifyRefreshToken(strToken string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(strToken, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(m.refreshTokenSecretKey), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
