package util

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func GeneratePatientCode(id primitive.ObjectID) string {
	if id.IsZero() {
		return ""
	}

	sum := sha256.Sum256([]byte("patient:" + id.Hex()))
	code := strings.ToUpper(hex.EncodeToString(sum[:])[:10])
	return "PT-" + code
}
