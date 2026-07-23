package util

import (
	"net/url"
	"os"
	"strings"
)

// PublicAPIBaseURL returns the externally reachable API origin used in email/SMS links.
// Prefer BE_URL; fall back to the scheme+host of GOOGLE_REDIRECT_URL.
func PublicAPIBaseURL() string {
	if raw := strings.TrimSpace(os.Getenv("BE_URL")); raw != "" {
		return strings.TrimRight(raw, "/")
	}
	if redirect := strings.TrimSpace(os.Getenv("GOOGLE_REDIRECT_URL")); redirect != "" {
		if u, err := url.Parse(redirect); err == nil && u.Scheme != "" && u.Host != "" {
			return strings.TrimRight(u.Scheme+"://"+u.Host, "/")
		}
	}
	return "http://localhost:8080"
}

// AcceptInviteURL builds the set-password link for an admin-created patient invite.
func AcceptInviteURL(rawToken string) string {
	return PublicAPIBaseURL() + "/auth/accept-invite?token=" + url.QueryEscape(rawToken)
}
