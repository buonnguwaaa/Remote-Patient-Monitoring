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

// FrontendWebURL returns the doctor web portal base URL from FE_WEB_URL env.
func FrontendWebURL() string {
	if raw := strings.TrimSpace(os.Getenv("FE_WEB_URL")); raw != "" {
		return strings.TrimRight(raw, "/")
	}
	return "http://localhost:3000"
}

// AcceptInviteURL builds the set-password link for an admin-created patient invite.
func AcceptInviteURL(rawToken string) string {
	return PublicAPIBaseURL() + "/auth/accept-invite?token=" + url.QueryEscape(rawToken)
}

// SmartInviteURL builds the smart-redirect link that dispatches to the correct
// destination (native app deep link, web portal, or HTML fallback) based on the
// user's role and device.
func SmartInviteURL(rawToken string, role string) string {
	return PublicAPIBaseURL() + "/auth/smart-invite?token=" + url.QueryEscape(rawToken) + "&role=" + url.QueryEscape(role)
}
