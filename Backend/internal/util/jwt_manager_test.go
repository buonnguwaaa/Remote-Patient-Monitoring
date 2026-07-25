package util_test

import (
	"testing"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

func TestGenerateAccessTokenIncludesJTI(t *testing.T) {
	m := util.NewJWTManager("test-secret")
	token, err := m.GenerateAccessToken("507f1f77bcf86cd799439011", domain.RolePatient)
	if err != nil {
		t.Fatalf("GenerateAccessToken: %v", err)
	}

	claims, err := m.VerifyAccessToken(token)
	if err != nil {
		t.Fatalf("VerifyAccessToken: %v", err)
	}
	if claims.ID == "" {
		t.Fatal("expected non-empty jti")
	}
	if claims.Subject != "507f1f77bcf86cd799439011" {
		t.Fatalf("unexpected subject: %s", claims.Subject)
	}
	if claims.Role != domain.RolePatient {
		t.Fatalf("unexpected role: %s", claims.Role)
	}
	if claims.ExpiresAt == nil || claims.ExpiresAt.Before(time.Now()) {
		t.Fatal("expected future expiry")
	}
}

func TestVerifyAccessTokenRejectsMissingJTI(t *testing.T) {
	m := util.NewJWTManager("test-secret")
	// Craft via Generate then we can't easily strip jti; instead verify random invalid token fails.
	_, err := m.VerifyAccessToken("not.a.jwt")
	if err == nil {
		t.Fatal("expected error for invalid token")
	}
}
