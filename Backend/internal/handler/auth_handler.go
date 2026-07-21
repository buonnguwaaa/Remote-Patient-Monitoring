package handler

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
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
	c.JSON(http.StatusCreated, gin.H{"data": resp, "message": "Đăng ký người dùng thành công"})
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

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Đăng nhập thành công"})
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	user, err := h.service.Me(ctx, &usecase.MeInput{UserID: userID.(string)})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": user, "message": "Lấy thông tin người dùng thành công"})
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
	c.JSON(http.StatusOK, gin.H{"accessToken": accessToken, "message": "Làm mới token truy cập thành công"})
}

// @Summary Logout
// @Description Revoke refresh token, blacklist access token, and clear session
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
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgMissingRefreshToken})
			return
		}
		req.RefreshToken = cookie
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	logoutInput := &usecase.LogoutInput{RefreshToken: req.RefreshToken}
	if jti, ok := c.Get("jti"); ok {
		if jtiStr, ok := jti.(string); ok {
			logoutInput.AccessJTI = jtiStr
		}
	}
	if exp, ok := c.Get("tokenExp"); ok {
		if expTime, ok := exp.(time.Time); ok {
			logoutInput.AccessExp = expTime
		}
	}

	if err := h.service.Logout(ctx, logoutInput); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sameSite := http.SameSiteLaxMode
	if strings.ToLower(os.Getenv("FORCE_SAMESITE_NONE")) == "true" {
		sameSite = http.SameSiteNoneMode
	}
	c.SetSameSite(sameSite)
	c.SetCookie("accessToken", "", -1, "/", "", h.isSecure(c), true)
	c.SetCookie("refreshToken", "", -1, "/", "", h.isSecure(c), true)

	c.JSON(http.StatusOK, gin.H{"message": "Đăng xuất thành công"})
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

	c.Redirect(http.StatusTemporaryRedirect, os.Getenv("FE_MOBILE_URI")+"?accessToken="+resp.AccessToken+"&refreshToken="+resp.RefreshToken)
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
	c.JSON(http.StatusOK, gin.H{"message": "Liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn"})
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
		Email:                req.Email,
		OTP:                  req.OTP,
		NewPassword:          req.NewPassword,
		ConfirmedNewPassword: req.ConfirmedNewPassword,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.ResetPassword(ctx, input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Đặt lại mật khẩu thành công"})
}

// @Summary Activate account
// @Description Activate user account using OTP sent to email
// @Tags auth
// @Accept json
// @Produce json
// @Param data body dto.ActivateAccountRequest true "Email and OTP"
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

	if err := h.service.ActivateAccount(ctx, &usecase.ActivateAccountInput{
		Email: req.Email,
		OTP:   req.OTP,
	}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kích hoạt tài khoản thành công"})
}

// @Summary Resend Activation Email
// @Description Resend account activation OTP to user email
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
	c.JSON(http.StatusOK, gin.H{"message": "Đã gửi lại email kích hoạt thành công"})
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

	domain := os.Getenv("COOKIE_DOMAIN")

	c.SetCookie(
		"accessToken",
		accessToken,
		maxAge,
		"/",
		domain,
		isSecure,
		true,
	)
}

func (h *AuthHandler) setRefreshTokenCookie(c *gin.Context, refreshToken string) {
	maxAge := int(util.RefreshTokenTTL.Seconds())
	isSecure := h.isSecure(c)
	h.setSameSite(c, isSecure)

	domain := os.Getenv("COOKIE_DOMAIN")

	c.SetCookie(
		"refreshToken",
		refreshToken,
		maxAge,
		"/",
		domain,
		isSecure,
		true,
	)
}

func (h *AuthHandler) setSameSite(c *gin.Context, isSecure bool) {
	isCrossSite := os.Getenv("COOKIE_CROSS_SITE") == "true"
	if os.Getenv("GIN_MODE") == "release" && isSecure && isCrossSite {
		c.SetSameSite(http.SameSiteNoneMode)
	} else {
		c.SetSameSite(http.SameSiteLaxMode)
	}
}
