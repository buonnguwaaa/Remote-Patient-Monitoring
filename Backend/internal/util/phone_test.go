package util

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestNormalizePhone(t *testing.T) {
	tests := map[string]string{
		"090 123 4567":      "+84901234567",
		"84-901-234-567":    "+84901234567",
		"+1 (415) 555-2671": "+14155552671",
	}

	for input, want := range tests {
		if got := NormalizePhone(input); got != want {
			t.Fatalf("NormalizePhone(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestHashPhoneForLookupUsesCanonicalPhone(t *testing.T) {
	t.Setenv("FIELD_ENCRYPTION_KEY", testFieldKey())

	localHash, err := HashPhoneForLookup("0901234567")
	if err != nil {
		t.Fatal(err)
	}
	e164Hash, err := HashPhoneForLookup("+84901234567")
	if err != nil {
		t.Fatal(err)
	}
	if localHash != e164Hash {
		t.Fatal("equivalent phone formats must produce the same lookup hash")
	}
}

func TestHashPhoneForLookupRequiresKey(t *testing.T) {
	t.Setenv("FIELD_ENCRYPTION_KEY", "")
	if _, err := HashPhoneForLookup("0901234567"); err == nil {
		t.Fatal("expected missing HMAC key error")
	}
}

func testFieldKey() string {
	return base64.StdEncoding.EncodeToString([]byte(strings.Repeat("k", 32)))
}
