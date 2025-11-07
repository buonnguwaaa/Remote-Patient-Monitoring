package utils

import (
	"crypto/rand"
	"encoding/base64"
)

// Sinh token ngẫu nhiên an toàn, mã hóa Base64URL
func SecureRandomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
