package utils

import (
	"errors"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/golang-jwt/jwt/v5"
	"time"
)

const (
	AccessTokenTTL  = 24 * time.Hour
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
	Role users.Role `json:"role"`
	jwt.RegisteredClaims
}

func (m *JWTManager) GenerateAccessToken(userID string, role users.Role) (string, error) {
	claims := &Claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.accessTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(m.accessTokenSecretKey))
}

func (m *JWTManager) GenerateRefreshToken(userID string) (string, error) {
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.refreshTokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
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
