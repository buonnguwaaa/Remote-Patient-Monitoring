package util

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
)

func NormalizePhone(value string) string {
	replacer := strings.NewReplacer(
		" ", "",
		"-", "",
		".", "",
		"(", "",
		")", "",
	)
	normalized := replacer.Replace(strings.TrimSpace(value))
	if strings.HasPrefix(normalized, "0") {
		return "+84" + strings.TrimPrefix(normalized, "0")
	}
	if strings.HasPrefix(normalized, "84") {
		return "+" + normalized
	}
	return normalized
}

// HashPhoneForLookup creates a deterministic, keyed lookup value while the
// phone itself remains encrypted with randomized AES-GCM at rest.
func HashPhoneForLookup(phone string) (string, error) {
	normalized := NormalizePhone(phone)
	if normalized == "" {
		return "", nil
	}

	fieldKey, err := DecodeFieldEncryptionKey(os.Getenv("FIELD_ENCRYPTION_KEY"))
	if err != nil {
		return "", fmt.Errorf("FIELD_ENCRYPTION_KEY không hợp lệ cho phone lookup: %w", err)
	}

	// Derive a purpose-specific key instead of using the AES key material
	// directly as the phone HMAC key.
	deriver := hmac.New(sha256.New, fieldKey)
	_, _ = deriver.Write([]byte("rpm:phone-lookup:v1"))
	lookupKey := deriver.Sum(nil)

	mac := hmac.New(sha256.New, lookupKey)
	_, _ = mac.Write([]byte(normalized))
	return hex.EncodeToString(mac.Sum(nil)), nil
}
