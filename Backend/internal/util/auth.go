package util

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"strings"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func ComparePassword(hashedPassword string, rawPassword string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(rawPassword)) == nil
}

func HashTokenSHA256(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func MustHexToObjectID(hexStr string) (primitive.ObjectID, error) {
	if hexStr == "" {
		return primitive.NilObjectID, errors.New("empty hex string")
	}

	id, err := primitive.ObjectIDFromHex(hexStr)
	if err != nil {
		log.Println("[GIN-error] Failed to convert hex to ObjectID:", err)
		return primitive.NilObjectID, err
	}
	return id, nil
}

func GenerateRandomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func GenerateNumericOTP(length int) (string, error) {
	if length <= 0 {
		return "", errors.New("invalid OTP length")
	}

	max := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(length)), nil)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}

	format := fmt.Sprintf("%%0%dd", length)
	return fmt.Sprintf(format, n.Int64()), nil
}

func GenerateUserPublicID(id primitive.ObjectID, role domain.Role) string {
	if id.IsZero() {
		return ""
	}

	sum := sha256.Sum256([]byte("user:" + id.Hex()))
	code := strings.ToUpper(hex.EncodeToString(sum[:])[:10])

	prefix := getRolePrefix(role)
	return prefix + "-" + code
}

func getRolePrefix(role domain.Role) string {
	switch role {
	case domain.RolePatient:
		return "PAT"
	case domain.RoleDoctor:
		return "DOC"
	case domain.RoleNurse:
		return "NUR"
	case domain.RoleAdmin:
		return "ADM"
	default:
		return "USR"
	}
}
