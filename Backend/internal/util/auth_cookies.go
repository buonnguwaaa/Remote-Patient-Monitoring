package util

import (
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// Auth client scopes keep admin and doctor web sessions from overwriting
// each other when both share the same API cookie jar.
const (
	AuthClientWeb   = "web"
	AuthClientAdmin = "admin"

	WebAccessTokenCookie    = "accessToken"
	WebRefreshTokenCookie   = "refreshToken"
	AdminAccessTokenCookie  = "adminAccessToken"
	AdminRefreshTokenCookie = "adminRefreshToken"
)

// FrontendAdminURL returns the admin web portal base URL from FE_ADMIN_URL env.
func FrontendAdminURL() string {
	if raw := strings.TrimSpace(os.Getenv("FE_ADMIN_URL")); raw != "" {
		return strings.TrimRight(raw, "/")
	}
	return "http://localhost:3001"
}

// CookieDomain returns COOKIE_DOMAIN (may be empty for host-only cookies).
func CookieDomain() string {
	return os.Getenv("COOKIE_DOMAIN")
}

// ResolveAuthClient identifies which frontend is calling the API.
// Admin is matched before web so admin.example.com is not treated as example.com.
func ResolveAuthClient(r *http.Request) string {
	if r == nil {
		return AuthClientWeb
	}

	candidates := []string{
		strings.TrimSpace(r.Header.Get("Origin")),
		strings.TrimSpace(r.Header.Get("Referer")),
	}

	adminOrigin := FrontendAdminURL()
	webOrigin := FrontendWebURL()

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if originsMatch(candidate, adminOrigin) {
			return AuthClientAdmin
		}
	}
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if originsMatch(candidate, webOrigin) {
			return AuthClientWeb
		}
	}

	return AuthClientWeb
}

// AccessTokenCookieName returns the HttpOnly access-token cookie for a client.
func AccessTokenCookieName(client string) string {
	if client == AuthClientAdmin {
		return AdminAccessTokenCookie
	}
	return WebAccessTokenCookie
}

// RefreshTokenCookieName returns the HttpOnly refresh-token cookie for a client.
func RefreshTokenCookieName(client string) string {
	if client == AuthClientAdmin {
		return AdminRefreshTokenCookie
	}
	return WebRefreshTokenCookie
}

// ReadAccessTokenCookie reads the access token for the request's auth client.
func ReadAccessTokenCookie(c *gin.Context) string {
	name := AccessTokenCookieName(ResolveAuthClient(c.Request))
	token, err := c.Cookie(name)
	if err != nil || token == "" {
		return ""
	}
	return token
}

// ReadRefreshTokenCookie reads the refresh token for the request's auth client.
func ReadRefreshTokenCookie(c *gin.Context) string {
	name := RefreshTokenCookieName(ResolveAuthClient(c.Request))
	token, err := c.Cookie(name)
	if err != nil || token == "" {
		return ""
	}
	return token
}

func originsMatch(requestURL, configured string) bool {
	req, err := url.Parse(requestURL)
	if err != nil || req.Scheme == "" || req.Host == "" {
		return false
	}
	cfg, err := url.Parse(configured)
	if err != nil || cfg.Scheme == "" || cfg.Host == "" {
		return false
	}
	return strings.EqualFold(req.Scheme, cfg.Scheme) && strings.EqualFold(req.Host, cfg.Host)
}
