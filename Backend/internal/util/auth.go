package util

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"log"

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
