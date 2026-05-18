package handler

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	service service.AuthService
}

func NewAuthHandler(service service.AuthService) *AuthHandler {
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
	input := &usecase.RegisterInput{
		Name:              req.Name,
		Email:             req.Email,
		Password:          req.Password,
		ConfirmedPassword: req.ConfirmedPassword,
		Role:              domain.Role(req.Role),
		Gender:            domain.Gender(req.Gender),
		Dob:               dob,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.service.Register(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": resp, "message": "User registered successfully"})
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
	input := &usecase.LoginInput{
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

	c.JSON(http.StatusOK, gin.H{"message": "User logged in successfully"})
}

// Me retrieves the authenticated user's information
// @Summary Get authenticated user info
// @Description Retrieve information about the authenticated user
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "User information retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.service.Me(ctx, &usecase.MeInput{UserID: userID.(string)})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user, "message": "User info retrieved successfully"})
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
		cookie, cookieErr := c.Cookie("refreshToken")
		if cookieErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		req.RefreshToken = cookie
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	accessToken, err := h.service.Refresh(ctx, &usecase.RefreshInput{RefreshToken: req.RefreshToken})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.setAccessTokenCookie(c, accessToken)
	c.JSON(http.StatusOK, gin.H{"message": "Refresh access token successfully"})
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
		cookie, err := c.Cookie("refreshToken")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing refresh token"})
			return
		}
		req.RefreshToken = cookie
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.Logout(ctx, &usecase.LogoutInput{RefreshToken: req.RefreshToken}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sameSite := http.SameSiteLaxMode
	if strings.ToLower(os.Getenv("FORCE_SAMESITE_NONE")) == "true" {
		sameSite = http.SameSiteNoneMode
	}
	c.SetSameSite(sameSite)
	c.SetCookie("access_token", "", -1, "/", "", h.isSecure(c), false)
	c.SetCookie("refresh_token", "", -1, "/", "", h.isSecure(c), true)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
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

	resp, err := h.service.HandleGoogleOAuth2Callback(ctx, &usecase.GoogleOAuth2Input{Code: code})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.setAccessTokenCookie(c, resp.AccessToken)
	h.setRefreshTokenCookie(c, resp.RefreshToken)

	c.Redirect(http.StatusTemporaryRedirect, os.Getenv("FE_WEB_URL"))
}

// @Summary Forgot Password
// @Description Send reset link to user email
// @Tags auth
// @Accept json
// @Produce json
// @Param data body dto.ForgotPasswordRequest true "Email"
// @Success 200 {object} map[string]string "Reset password link was sent to your mailbox"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req dto.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.ForgotPassword(ctx, &usecase.ForgotPasswordInput{Email: req.Email}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Reset password link was sent to your mailbox"})
}

// @Summary Reset Password
// @Description Reset password using va	lid token
// @Tags auth
// @Accept json
// @Produce json
// @Param data body dto.ResetPasswordRequest true "New password"
// @Success 200 {object} map[string]string "Password reset successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	input := &usecase.ResetPasswordInput{
		Token:                req.ResetToken,
		NewPassword:          req.NewPassword,
		ConfirmedNewPassword: req.ConfirmedNewPassword,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.ResetPassword(ctx, input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

// @Summary Activate account
// @Description Activate user account created from local strategy using token from email link
// @Tags auth
// @Produce json
// @Param data body dto.ActivateAccountRequest true "Activation token"
// @Success 200 {object} map[string]string "Account activated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/activate [post]
func (h *AuthHandler) ActivateAccount(c *gin.Context) {
	var req dto.ActivateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.ActivateAccount(ctx, &usecase.ActivateAccountInput{Token: req.ActivateToken}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Account activated successfully"})
}

// @Summary Resend Activation Email
// @Description Resend account activation email to user
// @Tags auth
// @Accept json
// @Produce json
// @Param data body dto.ResendActivationEmailRequest true "Email"
// @Success 200 {object} map[string]string "Activation email resent successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/resend-activation [post]
func (h *AuthHandler) ResendActivationEmail(c *gin.Context) {
	var req dto.ResendActivationEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.ResendActivationEmail(ctx, &usecase.ResendActivationEmailInput{Email: req.Email}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Activation email resent successfully"})
}

// ========================================================
// =============== Private Helper Functions ===============
// ========================================================
// func (h *AuthHandler) setSameSite(c *gin.Context) {
// 	if os.Getenv("GIN_MODE") == "release" {
// 		c.SetSameSite(http.SameSiteNoneMode)
// 	} else {
// 		c.SetSameSite(http.SameSiteLaxMode)
// 	}
// }

func (h *AuthHandler) isSecure(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}

	// Check X-Forwarded-Proto header for cases behind a proxy
	return strings.EqualFold(
		c.GetHeader("X-Forwarded-Proto"),
		"https",
	)
}

func (h *AuthHandler) setAccessTokenCookie(c *gin.Context, accessToken string) {
	maxAge := int(util.AccessTokenTTL.Seconds())
	isSecure := h.isSecure(c)
	h.setSameSite(c, isSecure)
	c.SetCookie(
		"accessToken",
		accessToken,
		maxAge,
		"/",
		"",
		isSecure,
		true,
	)
}

func (h *AuthHandler) setRefreshTokenCookie(c *gin.Context, refreshToken string) {
	maxAge := int(util.RefreshTokenTTL.Seconds())
	isSecure := h.isSecure(c)
	h.setSameSite(c, isSecure)
	c.SetCookie(
		"refreshToken",
		refreshToken,
		maxAge,
		"/",
		"",
		isSecure,
		true,
	)
}

func (h *AuthHandler) setSameSite(c *gin.Context, isSecure bool) {
	if os.Getenv("GIN_MODE") == "release" && isSecure {
		c.SetSameSite(http.SameSiteNoneMode)
	} else {
		c.SetSameSite(http.SameSiteLaxMode)
	}
}
