package util

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
)

const (
	// fieldEncPrefix marks ciphertext produced by this package so legacy
	// plaintext rows can still be read during migration.
	fieldEncPrefix = "rpm1:"
	aesKeySize     = 32 // AES-256
)

// FieldEncryptor encrypts/decrypts individual string fields at rest.
// Production deployments should supply a 32-byte key via FIELD_ENCRYPTION_KEY
// (base64). The same interface can later wrap a KMS-managed data key.
type FieldEncryptor interface {
	Encrypt(plaintext string) (string, error)
	Decrypt(ciphertext string) (string, error)
	Enabled() bool
}

type aesFieldEncryptor struct {
	gcm cipher.AEAD
}

type noopFieldEncryptor struct{}

func (noopFieldEncryptor) Encrypt(plaintext string) (string, error)  { return plaintext, nil }
func (noopFieldEncryptor) Decrypt(ciphertext string) (string, error) { return ciphertext, nil }
func (noopFieldEncryptor) Enabled() bool                             { return false }

// NewNoopFieldEncryptor returns a pass-through encryptor (dev / tests).
func NewNoopFieldEncryptor() FieldEncryptor {
	return noopFieldEncryptor{}
}

// NewAESFieldEncryptor builds an AES-256-GCM encryptor from a raw 32-byte key.
func NewAESFieldEncryptor(key []byte) (FieldEncryptor, error) {
	if len(key) != aesKeySize {
		return nil, fmt.Errorf("field encryption key must be %d bytes, got %d", aesKeySize, len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("field encryption cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("field encryption gcm: %w", err)
	}
	return &aesFieldEncryptor{gcm: gcm}, nil
}

// NewAESFieldEncryptorFromBase64 decodes a base64 key then builds the encryptor.
func NewAESFieldEncryptorFromBase64(encoded string) (FieldEncryptor, error) {
	key, err := DecodeFieldEncryptionKey(encoded)
	if err != nil {
		return nil, err
	}
	return NewAESFieldEncryptor(key)
}

func DecodeFieldEncryptionKey(encoded string) ([]byte, error) {
	encoded = strings.TrimSpace(encoded)
	if encoded == "" {
		return nil, errors.New("empty field encryption key")
	}
	key, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("decode field encryption key: %w", err)
	}
	if len(key) != aesKeySize {
		return nil, fmt.Errorf("field encryption key must be %d bytes, got %d", aesKeySize, len(key))
	}
	return key, nil
}

// LoadFieldEncryptorFromEnv reads FIELD_ENCRYPTION_KEY (base64 of 32 bytes).
// When the key is unset: returns a noop encryptor in non-release mode, or an
// error in release mode so PHI cannot be stored in plaintext in production.
func LoadFieldEncryptorFromEnv() (FieldEncryptor, error) {
	encoded := strings.TrimSpace(os.Getenv("FIELD_ENCRYPTION_KEY"))
	if encoded == "" {
		if strings.EqualFold(os.Getenv("GIN_MODE"), "release") {
			return nil, errors.New("FIELD_ENCRYPTION_KEY is required when GIN_MODE=release")
		}
		return NewNoopFieldEncryptor(), nil
	}
	return NewAESFieldEncryptorFromBase64(encoded)
}

func (e *aesFieldEncryptor) Enabled() bool { return true }

func (e *aesFieldEncryptor) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	if IsPHIFieldEncrypted(plaintext) {
		return plaintext, nil
	}

	nonce := make([]byte, e.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("field encryption nonce: %w", err)
	}

	sealed := e.gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return fieldEncPrefix + base64.RawURLEncoding.EncodeToString(sealed), nil
}

func (e *aesFieldEncryptor) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}
	if !IsPHIFieldEncrypted(ciphertext) {
		// Legacy plaintext written before encryption was enabled.
		return ciphertext, nil
	}

	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(ciphertext, fieldEncPrefix))
	if err != nil {
		return "", fmt.Errorf("field encryption decode: %w", err)
	}
	nonceSize := e.gcm.NonceSize()
	if len(raw) < nonceSize {
		return "", errors.New("field encryption ciphertext too short")
	}
	nonce, sealed := raw[:nonceSize], raw[nonceSize:]
	plain, err := e.gcm.Open(nil, nonce, sealed, nil)
	if err != nil {
		return "", fmt.Errorf("field encryption decrypt: %w", err)
	}
	return string(plain), nil
}

// IsPHIFieldEncrypted reports whether value already looks like rpm1 ciphertext.
func IsPHIFieldEncrypted(value string) bool {
	return strings.HasPrefix(value, fieldEncPrefix)
}
