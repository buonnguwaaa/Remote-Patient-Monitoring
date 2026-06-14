package config

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
)

var FirebaseCredentials []byte

type serviceAccountMeta struct {
	ProjectID string `json:"project_id"`
}

func LoadFirebaseCredentials() error {
	credJSON, err := resolveFirebaseJSON()
	if err != nil {
		return fmt.Errorf("firebase: %w", err)
	}

	// Validate JSON structure and mandatory field.
	var meta serviceAccountMeta
	if err := json.Unmarshal(credJSON, &meta); err != nil {
		return fmt.Errorf("firebase: credentials JSON is malformed: %w", err)
	}
	if strings.TrimSpace(meta.ProjectID) == "" {
		return fmt.Errorf("firebase: credentials JSON is missing required field 'project_id'")
	}

	FirebaseCredentials = credJSON
	log.Printf("[GIN-info] Firebase credentials loaded (project_id=%s)", meta.ProjectID)
	return nil
}

// resolveFirebaseJSON returns the raw service-account JSON bytes from
// whichever source is configured (Base64 env var → file path).
func resolveFirebaseJSON() ([]byte, error) {
	// --- Strategy 1: Base64 env var (preferred for production) ---
	b64 := strings.TrimSpace(os.Getenv("FIREBASE_CREDENTIALS_BASE64"))
	if b64 != "" {
		decoded, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			// Try URL-safe variant in case the operator used `base64 -w0` on some systems.
			decoded, err = base64.URLEncoding.DecodeString(b64)
			if err != nil {
				return nil, fmt.Errorf(
					"FIREBASE_CREDENTIALS_BASE64 is set but cannot be decoded as Base64: %w", err,
				)
			}
		}
		if len(decoded) == 0 {
			return nil, fmt.Errorf("FIREBASE_CREDENTIALS_BASE64 decoded to empty content")
		}
		return decoded, nil
	}

	// --- Strategy 2: Physical file path (local development fallback) ---
	filePath := strings.TrimSpace(os.Getenv("FIREBASE_CREDENTIALS_FILE"))
	if filePath != "" {
		data, err := os.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf(
				"FIREBASE_CREDENTIALS_FILE is set to %q but the file cannot be read: %w", filePath, err,
			)
		}
		if len(data) == 0 {
			return nil, fmt.Errorf("FIREBASE_CREDENTIALS_FILE %q is empty", filePath)
		}
		log.Println("[GIN-warning] Firebase credentials loaded from file — use FIREBASE_CREDENTIALS_BASE64 in production")
		return data, nil
	}

	// Neither variable is set.
	return nil, fmt.Errorf(
		"no Firebase credentials configured: set FIREBASE_CREDENTIALS_BASE64 (production) " +
			"or FIREBASE_CREDENTIALS_FILE (local dev)",
	)
}
