package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
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
		Phone:             req.Phone,
		Password:          req.Password,
		ConfirmedPassword: req.ConfirmedPassword,
		Gender:            req.Gender,
		Dob:               dob,
		PatientProfileFieldsInput: usecase.PatientProfileFieldsInput{
			InsuranceNumber:       req.InsuranceNumber,
			CCCD:                  req.CCCD,
			EmergencyContactName:  req.EmergencyContactName,
			EmergencyContactPhone: req.EmergencyContactPhone,
			MedicalHistory:        req.MedicalHistory,
			DiseaseTypes:          req.DiseaseTypes,
		},
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
		Identifier: firstNonEmpty(req.Identifier, req.Email, req.Phone),
		Password:   req.Password,
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
	c.JSON(http.StatusOK, gin.H{"message": "Mã OTP đã được gửi đến email của bạn"})
}

// @Summary Verify Reset OTP
// @Description Verify reset password OTP code
// @Tags auth
// @Accept json
// @Produce json
// @Param data body dto.VerifyResetOTPRequest true "Email and OTP"
// @Success 200 {object} map[string]string "OTP verified successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Router /auth/verify-reset-otp [post]
func (h *AuthHandler) VerifyResetOTP(c *gin.Context) {
	var req dto.VerifyResetOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email hoặc mã OTP không hợp lệ"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.VerifyResetOTP(ctx, req.Email, req.OTP); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mã OTP hợp lệ"})
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

// ShowAcceptInvite renders the set-password form for patient/nurse invite links (browser fallback).
// After success, users are directed to the corresponding mobile app — not the doctor web portal.
// @Summary Show accept-invite form
// @Tags auth
// @Produce html
// @Param token query string true "Invite token"
// @Param role query string false "User role (user.patient, user.nurse)"
// @Success 200 {string} string "HTML form"
// @Router /auth/accept-invite [get]
func (h *AuthHandler) ShowAcceptInvite(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	role := strings.TrimSpace(c.Query("role"))
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	name, err := h.service.PreviewAcceptInvite(ctx, token)
	if err != nil {
		h.renderAcceptInvitePage(c, http.StatusBadRequest, acceptInviteExpiredBody())
		return
	}

	h.renderAcceptInvitePage(c, http.StatusOK, acceptInviteFormBody(name, token, role, ""))
}

// SubmitAcceptInvite completes first-time password setup from the invite link.
// @Summary Submit accept-invite form
// @Tags auth
// @Accept application/x-www-form-urlencoded
// @Produce html
// @Param token formData string true "Invite token"
// @Param role formData string false "User role"
// @Param password formData string true "New password"
// @Param confirmedPassword formData string true "Confirm password"
// @Success 200 {string} string "HTML success"
// @Router /auth/accept-invite [post]
func (h *AuthHandler) SubmitAcceptInvite(c *gin.Context) {
	token := strings.TrimSpace(c.PostForm("token"))
	role := strings.TrimSpace(c.PostForm("role"))
	password := c.PostForm("password")
	confirmed := c.PostForm("confirmedPassword")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.AcceptInvite(ctx, token, password, confirmed); err != nil {
		name, previewErr := h.service.PreviewAcceptInvite(ctx, token)
		if previewErr != nil {
			h.renderAcceptInvitePage(c, http.StatusBadRequest, acceptInviteExpiredBody())
			return
		}
		h.renderAcceptInvitePage(c, http.StatusBadRequest, acceptInviteFormBody(name, token, role, err.Error()))
		return
	}

	h.renderAcceptInvitePage(c, http.StatusOK, acceptInviteSuccessBody(role))
}

func (h *AuthHandler) renderAcceptInvitePage(c *gin.Context, status int, body string) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	htmlContent := strings.Replace(constant.AcceptInvitePageTemplate, "{{BODY}}", body, 1)
	c.String(status, "%s", htmlContent)
}

func acceptInviteAppLabel(role string) string {
	if isStaffAppRole(role) {
		return "ứng dụng RPM dành cho cán bộ y tế"
	}
	return "ứng dụng RPM"
}

func acceptInviteExpiredBody() string {
	return `
		<p class="error">Liên kết không hợp lệ hoặc đã hết hạn (15 phút).</p>
		<p class="hint">Nếu tài khoản có email, mở ứng dụng RPM → <strong>Quên mật khẩu</strong> để nhận mã OTP mới và đặt mật khẩu. Nếu chỉ có số điện thoại, hãy liên hệ quản trị viên để gửi lại liên kết.</p>
	`
}

func acceptInviteSuccessBody(role string) string {
	app := acceptInviteAppLabel(role)
	return `
		<p class="ok">Đặt mật khẩu thành công. Hãy mở ` + app + ` trên điện thoại và đăng nhập bằng email hoặc số điện thoại đã đăng ký.</p>
	`
}

func acceptInviteFormBody(name, token, role, formError string) string {
	errBlock := ""
	if formError != "" {
		errBlock = `<p class="error">` + htmlEscape(formError) + `</p>`
	}
	app := acceptInviteAppLabel(role)
	return errBlock + `
		<p>Chào <strong>` + htmlEscape(name) + `</strong>, hãy đặt mật khẩu để kích hoạt tài khoản RPM.</p>
		<form method="POST" action="/auth/accept-invite">
			<input type="hidden" name="token" value="` + htmlEscape(token) + `">
			<input type="hidden" name="role" value="` + htmlEscape(role) + `">
			<label for="password">Mật khẩu mới</label>
			<input id="password" name="password" type="password" minlength="6" required autocomplete="new-password">
			<label for="confirmedPassword">Xác nhận mật khẩu</label>
			<input id="confirmedPassword" name="confirmedPassword" type="password" minlength="6" required autocomplete="new-password">
			<button type="submit">Lưu mật khẩu</button>
		</form>
		<p class="hint">Liên kết có hiệu lực 15 phút. Sau khi lưu, đăng nhập trên ` + app + `.</p>
	`
}

func htmlEscape(s string) string {
	replacer := strings.NewReplacer(
		`&`, "&amp;",
		`<`, "&lt;",
		`>`, "&gt;",
		`"`, "&quot;",
		`'`, "&#39;",
	)
	return replacer.Replace(s)
}

// isDoctorInviteRole: chỉ bác sĩ dùng web portal sau khi đặt mật khẩu.
func isDoctorInviteRole(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "user.doctor", "doctor":
		return true
	default:
		return false
	}
}

// isStaffAppRole: bác sĩ + điều dưỡng mở app staff (rpm-doctor).
func isStaffAppRole(role string) bool {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "user.doctor", "doctor", "user.nurse", "nurse":
		return true
	default:
		return false
	}
}

// acceptInviteBrowserDestination:
// - bác sĩ → web portal (đặt MK rồi vào cổng bác sĩ)
// - bệnh nhân / điều dưỡng → trang HTML API (đặt MK rồi hướng dẫn mở app)
func acceptInviteBrowserDestination(token, role string) string {
	if isDoctorInviteRole(role) {
		return util.FrontendWebURL() + "/accept-invite?token=" + url.QueryEscape(token)
	}
	dest := util.AcceptInviteURL(token)
	if role != "" {
		dest += "&role=" + url.QueryEscape(role)
	}
	return dest
}

// HandleSmartInvite routes invite links by device + role:
// - Desktop doctor → doctor web; desktop patient/nurse → HTML set-password (then use mobile app)
// - Mobile: deep-link to rpm (patient) or rpm-doctor (doctor/nurse); fallback = browser destination above
// @Summary Handle smart invite link
// @Tags auth
// @Param token query string true "Invite token"
// @Param role query string false "User role (user.doctor, user.nurse, user.patient)"
// @Router /auth/smart-invite [get]
func (h *AuthHandler) HandleSmartInvite(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	role := strings.TrimSpace(c.Query("role"))
	userAgent := strings.ToLower(c.Request.UserAgent())
	useStaffApp := isStaffAppRole(role)

	isMobile := strings.Contains(userAgent, "android") ||
		strings.Contains(userAgent, "iphone") ||
		strings.Contains(userAgent, "ipad") ||
		strings.Contains(userAgent, "ipod") ||
		strings.Contains(userAgent, "mobile")

	browserURL := acceptInviteBrowserDestination(token, role)

	// Desktop / non-mobile browser: role-based set-password page.
	if !isMobile {
		c.Redirect(http.StatusFound, browserURL)
		return
	}

	// Mobile: try native app; if not installed, "Tiếp tục trên trình duyệt" uses browserURL.
	scheme := "rpm"
	appLabel := "Ứng dụng RPM"
	if useStaffApp {
		scheme = "rpm-doctor"
		appLabel = "Ứng dụng RPM Cán bộ y tế"
	}
	deepLink := fmt.Sprintf("%s://accept-invite?token=%s", scheme, url.QueryEscape(token))

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đang mở ứng dụng RPM...</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; text-align: center; padding: 40px 20px; color: #1e293b; }
  .card { max-width: 400px; margin: 0 auto; background: #ffffff; padding: 32px 24px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .btn { display: inline-block; width: 100%%; padding: 14px; margin-top: 12px; font-weight: 600; text-decoration: none; border-radius: 10px; box-sizing: border-box; text-align: center; }
  .btn-primary { background: #2563eb; color: #ffffff; }
  .btn-secondary { background: #e2e8f0; color: #334155; }
  p { font-size: 15px; line-height: 1.5; color: #64748b; }
</style>
<script>
  window.onload = function() {
    window.location.href = "%s";
  };
</script>
</head>
<body>
<div class="card">
  <h2>Đang kích hoạt tài khoản RPM</h2>
  <p>Hệ thống đang mở ứng dụng di động để bạn đặt mật khẩu...</p>
  <a href="%s" class="btn btn-primary">Mở %s</a>
  <a href="%s" class="btn btn-secondary">Tiếp tục trên Trình duyệt Web</a>
</div>
</body>
</html>`, deepLink, deepLink, appLabel, browserURL)

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, "%s", html)
}

// SubmitAcceptInviteApi completes first-time password setup via JSON API (for Mobile App and Web Portal).
// @Summary Submit accept-invite form via JSON API
// @Tags auth
// @Accept json
// @Produce json
// @Param data body dto.AcceptInviteApiRequest true "Token and password"
// @Success 200 {object} map[string]string "Success message"
// @Failure 400 {object} map[string]string "Error message"
// @Router /auth/accept-invite/api [post]
func (h *AuthHandler) SubmitAcceptInviteApi(c *gin.Context) {
	var req dto.AcceptInviteApiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thông tin không hợp lệ: " + err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.AcceptInvite(ctx, req.Token, req.Password, req.ConfirmedPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đặt mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ."})
}

// PreviewAcceptInviteApi checks if an invite token is valid and gets user's name via JSON API.
// @Summary Preview accept-invite token via JSON API
// @Tags auth
// @Produce json
// @Param token query string true "Invite token"
// @Success 200 {object} map[string]interface{} "User info"
// @Failure 400 {object} map[string]string "Error message"
// @Router /auth/accept-invite/preview [get]
func (h *AuthHandler) PreviewAcceptInviteApi(c *gin.Context) {
	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token là bắt buộc", "valid": false})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	name, err := h.service.PreviewAcceptInvite(ctx, token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "valid": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"name": name, "valid": true})
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
