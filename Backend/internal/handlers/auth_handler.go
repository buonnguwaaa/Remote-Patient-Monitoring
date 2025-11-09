package handlers

import (
	"context"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecases"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
	"strings"
	"time"
)

type AuthHandler struct {
	service services.AuthService
}

func NewAuthHandler(service services.AuthService) *AuthHandler {
	return &AuthHandler{
		service: service,
	}
}

// Register creates a new user
// @Summary Register a new user
// @Description Register a new user with the provided details
// @Tags auth
// @Accept json
// @Produce json
// @Param user body dto.RegisterRequest true "User registration details"
// @Success 201 {object} map[string]interface{} "User registered successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	dob, err := time.Parse("2006-01-02", req.Dob)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input := &usecases.RegisterInput{
		Name:              req.Name,
		Email:             req.Email,
		Password:          req.Password,
		ConfirmedPassword: req.ConfirmedPassword,
		Role:              req.Role,
		Gender:            req.Gender,
		Dob:               dob,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.service.Register(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": resp, "message": "user registered successfully"})
}

// Login authenticates a user and returns a JWT token
// @Summary Login a user
// @Description Authenticate a user and return a JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body dto.LoginRequest true "User login credentials"
// @Success 200 {object} map[string]interface{} "User logged in successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input := &usecases.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.service.Login(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.setAccessTokenCookie(c, resp.AccessToken)
	h.setRefreshTokenCookie(c, resp.RefreshToken)

	c.JSON(http.StatusOK, gin.H{"message": "user logged in successfully"})
}

// Me retrieves the authenticated user's information
// @Summary Get authenticated user info
// @Description Retrieve information about the authenticated user
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "User information retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /auth/me [post]
func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.service.Me(ctx, &usecases.MeInput{UserID: userID.(string)})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user})
}

// Refresh issues a new access token given a valid refresh token
// @Summary Refresh access token
// @Description Provide a refresh token to obtain a new access token
// @Tags auth
// @Accept json
// @Produce json
// @Param refresh body dto.RefreshRequest true "Refresh token"
// @Success 200 {object} map[string]interface{} "New access token"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var req dto.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		cookie, cookieErr := c.Cookie("refresh_token")
		if cookieErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		req.RefreshToken = cookie
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	accessToken, err := h.service.Refresh(ctx, &usecases.RefreshInput{RefreshToken: req.RefreshToken})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.setAccessTokenCookie(c, accessToken)
	c.JSON(http.StatusOK, gin.H{"message": "refresh access token successfully"})
}

// @Summary Logout
// @Description Revoke refresh token and clear session
// @Tags auth
// @Accept json
// @Produce json
// @Param logout body dto.LogoutRequest false "Logout request (falls back to cookies)"
// @Success 200 {object} map[string]string "Logged out successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	var req dto.LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		cookie, err := c.Cookie("refresh_token")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing refresh token"})
			return
		}
		req.RefreshToken = cookie
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.Logout(ctx, &usecases.LogoutInput{RefreshToken: req.RefreshToken}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("access_token", "", -1, "/", "", h.isSecure(c), false)
	c.SetCookie("refresh_token", "", -1, "/", "", h.isSecure(c), true)

	c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
}

// @Summary Google Login
// @Description Redirect user to Google OAuth2 login
// @Tags auth
// @Success 302 {string} string "Redirect"
// @Router /auth/google/login [get]
func (h *AuthHandler) HandleGoogleOAuth2Login(c *gin.Context) {
	// TODO: Generate and store state parameter to prevent CSRF
	url := h.service.GetGoogleLoginURL("random-state")
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// @Summary Google Callback
// @Description Handle Google OAuth2 callback and generate JWT, unified with LoginResponse
// @Tags auth
// @Produce json
// @Param code query string true "Google Auth Code"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /auth/google/callback [get]
func (h *AuthHandler) HandleGoogleOAuth2Callback(c *gin.Context) {
	code := c.Query("code")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := h.service.HandleGoogleOAuth2Callback(ctx, &usecases.GoogleOAuth2Input{Code: code})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.setAccessTokenCookie(c, resp.AccessToken)
	h.setRefreshTokenCookie(c, resp.RefreshToken)

	c.Redirect(http.StatusTemporaryRedirect, os.Getenv("FE_URL"))
}

func (h *AuthHandler) setAccessTokenCookie(c *gin.Context, accessToken string) {
	maxAge := int(utils.AccessTokenTTL.Seconds())
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"access_token",
		accessToken,
		maxAge,
		"/",
		"",
		h.isSecure(c),
		false,
	)
}

func (h *AuthHandler) setRefreshTokenCookie(c *gin.Context, refreshToken string) {
	maxAge := int(utils.RefreshTokenTTL.Seconds())
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		"refresh_token",
		refreshToken,
		maxAge,
		"/",
		"",
		h.isSecure(c),
		true,
	)
}

// isSecure determines whether cookies should be set with the Secure flag.
// It prefers TLS detection but allows an environment override or a HTTPS FE_URL.
func (h *AuthHandler) isSecure(c *gin.Context) bool {
	if strings.ToLower(os.Getenv("FORCE_COOKIE_SECURE")) == "true" {
		return true
	}
	if c.Request.TLS != nil {
		return true
	}
	fe := os.Getenv("FE_URL")
	if strings.HasPrefix(strings.ToLower(fe), "https://") {
		return true
	}
	return false
}
