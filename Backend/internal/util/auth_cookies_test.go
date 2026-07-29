package util

import (
	"net/http"
	"testing"
)

func TestResolveAuthClient(t *testing.T) {
	t.Setenv("FE_ADMIN_URL", "https://admin.remotepatientmonitoring.com")
	t.Setenv("FE_WEB_URL", "https://remotepatientmonitoring.com")

	tests := []struct {
		name   string
		origin string
		ref    string
		want   string
	}{
		{
			name:   "admin origin",
			origin: "https://admin.remotepatientmonitoring.com",
			want:   AuthClientAdmin,
		},
		{
			name: "admin referer with path",
			ref:  "https://admin.remotepatientmonitoring.com/users",
			want: AuthClientAdmin,
		},
		{
			name:   "web origin",
			origin: "https://remotepatientmonitoring.com",
			want:   AuthClientWeb,
		},
		{
			name:   "admin preferred over web when both present",
			origin: "https://admin.remotepatientmonitoring.com",
			ref:    "https://remotepatientmonitoring.com/",
			want:   AuthClientAdmin,
		},
		{
			name: "defaults to web",
			want: AuthClientWeb,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest(http.MethodGet, "https://api.example.com/auth/me", nil)
			if err != nil {
				t.Fatal(err)
			}
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if tt.ref != "" {
				req.Header.Set("Referer", tt.ref)
			}
			if got := ResolveAuthClient(req); got != tt.want {
				t.Fatalf("ResolveAuthClient() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestAccessTokenCookieName(t *testing.T) {
	if got := AccessTokenCookieName(AuthClientAdmin); got != AdminAccessTokenCookie {
		t.Fatalf("admin cookie = %q, want %q", got, AdminAccessTokenCookie)
	}
	if got := AccessTokenCookieName(AuthClientWeb); got != WebAccessTokenCookie {
		t.Fatalf("web cookie = %q, want %q", got, WebAccessTokenCookie)
	}
}
