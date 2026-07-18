package util_test

import (
	"strings"
	"testing"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

func TestAESFieldEncryptorRoundTrip(t *testing.T) {
	key := make([]byte, 32)
	for i := range key {
		key[i] = byte(i + 1)
	}
	enc, err := util.NewAESFieldEncryptor(key)
	if err != nil {
		t.Fatalf("NewAESFieldEncryptor: %v", err)
	}

	plain := "001075012345"
	cipherText, err := enc.Encrypt(plain)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if cipherText == plain {
		t.Fatal("expected ciphertext to differ from plaintext")
	}
	if !strings.HasPrefix(cipherText, "rpm1:") {
		t.Fatalf("expected rpm1: prefix, got %q", cipherText)
	}

	got, err := enc.Decrypt(cipherText)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != plain {
		t.Fatalf("got %q want %q", got, plain)
	}
}

func TestAESFieldEncryptorLegacyPlaintextPassthrough(t *testing.T) {
	key := make([]byte, 32)
	enc, err := util.NewAESFieldEncryptor(key)
	if err != nil {
		t.Fatalf("NewAESFieldEncryptor: %v", err)
	}

	legacy := "INS-2024-0001"
	got, err := enc.Decrypt(legacy)
	if err != nil {
		t.Fatalf("Decrypt legacy: %v", err)
	}
	if got != legacy {
		t.Fatalf("got %q want %q", got, legacy)
	}
}

func TestAESFieldEncryptorIdempotent(t *testing.T) {
	key := make([]byte, 32)
	enc, err := util.NewAESFieldEncryptor(key)
	if err != nil {
		t.Fatalf("NewAESFieldEncryptor: %v", err)
	}

	first, err := enc.Encrypt("secret-history")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	second, err := enc.Encrypt(first)
	if err != nil {
		t.Fatalf("Encrypt again: %v", err)
	}
	if first != second {
		t.Fatal("re-encrypting ciphertext should be a no-op")
	}
}

func TestAESFieldEncryptorFromBase64(t *testing.T) {
	// 32 zero bytes, base64
	enc, err := util.NewAESFieldEncryptorFromBase64("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
	if err != nil {
		t.Fatalf("FromBase64: %v", err)
	}
	if !enc.Enabled() {
		t.Fatal("expected enabled")
	}
}

func TestNoopFieldEncryptor(t *testing.T) {
	enc := util.NewNoopFieldEncryptor()
	if enc.Enabled() {
		t.Fatal("noop should be disabled")
	}
	got, err := enc.Encrypt("plain")
	if err != nil || got != "plain" {
		t.Fatalf("noop encrypt: %q %v", got, err)
	}
}
