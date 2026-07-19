package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	domainUser "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ActivityLoggerMiddleware struct {
	repo         *repository.ActivityLogRepository
	baseUserRepo userRepository.BaseUserRepository
}

func NewActivityLoggerMiddleware(repo *repository.ActivityLogRepository, baseUserRepo userRepository.BaseUserRepository) *ActivityLoggerMiddleware {
	return &ActivityLoggerMiddleware{
		repo:         repo,
		baseUserRepo: baseUserRepo,
	}
}

// LogActivity logs write activities (POST/PUT/PATCH/DELETE) for admin, doctor,
// nurse, and patient. GET requests are intentionally not logged.
func (m *ActivityLoggerMiddleware) LogActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Capture request body for POST/PUT/PATCH before processing
		var requestBody []byte
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Process request
		c.Next()

		// Skip logging for certain paths
		if shouldSkipLogging(c.Request.URL.Path) {
			return
		}

		// Only log successful requests (status < 400)
		if c.Writer.Status() >= 400 {
			return
		}

		// Only log write operations (POST, PUT, PATCH, DELETE) - skip GET requests
		if c.Request.Method == "GET" {
			return
		}

		// Special handling for login endpoint (no JWT required)
		if strings.Contains(c.Request.URL.Path, "/auth/login") && c.Request.Method == "POST" {
			m.logLoginActivity(c, requestBody)
			return
		}

		// For all other endpoints, require authentication
		userIDStr, userIDExists := c.Get("userId")
		roleVal, roleExists := c.Get("role")

		if !roleExists || !userIDExists {
			return
		}

		role, ok := roleVal.(domainUser.Role)
		if !ok || !isAuditableRole(role) {
			return
		}

		userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
		if err != nil {
			log.Printf("[ActivityLogger] Error parsing userID: %v", err)
			return
		}

		userName := defaultDisplayName(role)
		if user, err := m.baseUserRepo.FindByID(c.Request.Context(), userID); err == nil && user != nil {
			userName = user.Name
		}

		// Determine activity type and action
		activityType, action := determineActivityTypeAndAction(c.Request.Method, c.Request.URL.Path, c.Writer.Status())

		// Add metadata for certain operations
		metadata := sanitizeActivityMetadata(requestBody)

		// Add latitude/longitude from request headers if present
		lat := c.GetHeader("X-Location-Lat")
		lng := c.GetHeader("X-Location-Lng")
		if lat != "" && lng != "" {
			metadata["latitude"] = lat
			metadata["longitude"] = lng
		}

		// Skip if request only contains status field (status updates are logged with main update)
		if len(metadata) == 1 {
			if _, hasStatus := metadata["status"]; hasStatus {
				return
			}
		}

		if len(metadata) > 0 {
			action = enhanceActionMessage(action, metadata)
		}

		resource := extractResource(c.Request.URL.Path)
		resourceID := extractResourceID(c.Request.URL.Path)

		activityLog := &domain.ActivityLog{
			ID:         primitive.NewObjectID(),
			UserID:     userID,
			UserName:   userName,
			UserRole:   string(role),
			Type:       activityType,
			Action:     action,
			Resource:   resource,
			ResourceID: resourceID,
			Method:     c.Request.Method,
			Path:       c.Request.URL.Path,
			IPAddress:  c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
			StatusCode: c.Writer.Status(),
			CreatedAt:  time.Now(),
		}

		if patientID := resolvePatientID(c.Request.URL.Path, resource, resourceID, metadata, role, userID); patientID != nil {
			activityLog.PatientID = patientID
		}

		if len(metadata) > 0 {
			activityLog.Metadata = metadata
		}

		if err := m.repo.Create(c.Request.Context(), activityLog); err != nil {
			log.Printf("[ActivityLogger] Error saving activity log: %v", err)
			_ = c.Error(err)
		}
	}
}

// logLoginActivity logs login activities
func (m *ActivityLoggerMiddleware) logLoginActivity(c *gin.Context, requestBody []byte) {
	// Parse request body to get email
	var loginReq struct {
		Email string `json:"email"`
	}
	if err := json.Unmarshal(requestBody, &loginReq); err != nil || loginReq.Email == "" {
		return
	}

	user, err := m.baseUserRepo.FindByEmail(c.Request.Context(), loginReq.Email)
	if err != nil || user == nil {
		return
	}

	if !isAuditableRole(user.Role) {
		return
	}

	// Create activity log
	metadata := make(map[string]any)
	lat := c.GetHeader("X-Location-Lat")
	lng := c.GetHeader("X-Location-Lng")
	if lat != "" && lng != "" {
		metadata["latitude"] = lat
		metadata["longitude"] = lng
	}

	activityLog := &domain.ActivityLog{
		ID:         primitive.NewObjectID(),
		UserID:     user.ID,
		UserName:   user.Name,
		UserRole:   string(user.Role),
		Type:       domain.ActivityTypeLogin,
		Action:     "Đăng nhập vào hệ thống",
		Resource:   "auth",
		Method:     c.Request.Method,
		Path:       c.Request.URL.Path,
		IPAddress:  c.ClientIP(),
		UserAgent:  c.Request.UserAgent(),
		StatusCode: c.Writer.Status(),
		CreatedAt:  time.Now(),
	}

	if len(metadata) > 0 {
		activityLog.Metadata = metadata
	}

	// Save log synchronously for login to ensure it's saved
	if err := m.repo.Create(c.Request.Context(), activityLog); err != nil {
		log.Printf("[ActivityLogger] Login - error saving activity log: %v", err)
		_ = c.Error(err)
	}
}

func isAuditableRole(role domainUser.Role) bool {
	switch role {
	case domainUser.RoleAdmin, domainUser.RoleDoctor, domainUser.RoleNurse, domainUser.RolePatient:
		return true
	default:
		return false
	}
}

func defaultDisplayName(role domainUser.Role) string {
	switch role {
	case domainUser.RoleAdmin:
		return "Admin"
	case domainUser.RoleDoctor:
		return "Bác sĩ"
	case domainUser.RoleNurse:
		return "Y tá"
	case domainUser.RolePatient:
		return "Bệnh nhân"
	default:
		return "User"
	}
}

// shouldSkipLogging determines if a path should be skipped from logging
func shouldSkipLogging(path string) bool {
	skipPaths := []string{
		"/activity-logs",
		"/auth/me",
		"/auth/refresh",
		"/health",
		"/metrics",
		"/swagger",
		"/notification-tokens",
		"/realtime",
	}

	for _, skipPath := range skipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}

	return false
}

// determineActivityTypeAndAction determines the activity type and action based on method and path
func determineActivityTypeAndAction(method, path string, statusCode int) (domain.ActivityType, string) {
	// Failed requests
	if statusCode >= 400 {
		return domain.ActivityTypeSystem, "Failed request: " + method + " " + path
	}

	// Login
	if strings.Contains(path, "/auth/login") {
		return domain.ActivityTypeLogin, "Đăng nhập vào hệ thống"
	}

	// Logout
	if strings.Contains(path, "/auth/logout") {
		return domain.ActivityTypeLogin, "Đăng xuất khỏi hệ thống"
	}

	// Determine by HTTP method
	switch method {
	case "POST":
		if strings.Contains(path, "/register") {
			return domain.ActivityTypeCreate, generateCreateAction(path)
		}
		return domain.ActivityTypeCreate, generateCreateAction(path)
	case "PUT", "PATCH":
		return domain.ActivityTypeUpdate, generateUpdateAction(path)
	case "DELETE":
		return domain.ActivityTypeDelete, generateDeleteAction(path)
	default:
		return domain.ActivityTypeSystem, "Truy cập: " + path
	}
}

// generateCreateAction generates a human-readable create action
func generateCreateAction(path string) string {
	switch {
	case strings.Contains(path, "/doctors"):
		return "Thêm bác sĩ mới"
	case strings.Contains(path, "/nurses"):
		return "Thêm điều dưỡng mới"
	case strings.Contains(path, "/patients"):
		return "Thêm bệnh nhân mới"
	case strings.Contains(path, "/departments") && strings.Contains(path, "/members"):
		return "Thêm thành viên vào khoa/phòng"
	case strings.Contains(path, "/departments"):
		return "Tạo khoa/phòng mới"
	case strings.Contains(path, "/assignments"):
		return "Tạo phân công mới"
	case strings.Contains(path, "/thresholds"):
		return "Tạo ngưỡng cảnh báo mới"
	case strings.Contains(path, "/measurements"):
		return "Ghi nhận chỉ số sức khỏe"
	case strings.Contains(path, "/prescriptions"):
		return "Tạo đơn thuốc mới"
	case strings.Contains(path, "/medication-intakes"):
		return "Ghi nhận uống thuốc"
	case strings.Contains(path, "/reminders"):
		return "Tạo nhắc nhở mới"
	case strings.Contains(path, "/follow-up-appointments"):
		return "Tạo lịch tái khám mới"
	case strings.Contains(path, "/alerts"):
		return "Tạo cảnh báo mới"
	case strings.Contains(path, "/messages") || strings.Contains(path, "/chat"):
		return "Gửi tin nhắn"
	case strings.Contains(path, "/video-sessions"):
		return "Tạo phiên gọi video"
	case strings.Contains(path, "/auth/logout"):
		return "Đăng xuất khỏi hệ thống"
	default:
		return "Tạo mới: " + extractResource(path)
	}
}

// generateUpdateAction generates a human-readable update action
func generateUpdateAction(path string) string {
	switch {
	case strings.Contains(path, "/doctors"):
		return "Cập nhật thông tin bác sĩ"
	case strings.Contains(path, "/nurses"):
		return "Cập nhật thông tin điều dưỡng"
	case strings.Contains(path, "/patients"):
		return "Cập nhật thông tin bệnh nhân"
	case strings.Contains(path, "/departments"):
		return "Cập nhật thông tin khoa/phòng"
	case strings.Contains(path, "/assignments"):
		return "Cập nhật phân công"
	case strings.Contains(path, "/thresholds"):
		return "Cập nhật ngưỡng cảnh báo"
	case strings.Contains(path, "/measurements"):
		return "Cập nhật chỉ số sức khỏe"
	case strings.Contains(path, "/prescriptions"):
		return "Cập nhật đơn thuốc"
	case strings.Contains(path, "/reminders"):
		return "Cập nhật nhắc nhở"
	case strings.Contains(path, "/follow-up-appointments"):
		return "Cập nhật lịch tái khám"
	case strings.Contains(path, "/alerts"):
		return "Cập nhật cảnh báo"
	case strings.Contains(path, "/status"):
		return "Cập nhật trạng thái"
	default:
		return "Cập nhật: " + extractResource(path)
	}
}

// generateDeleteAction generates a human-readable delete action
func generateDeleteAction(path string) string {
	switch {
	case strings.Contains(path, "/doctors"):
		return "Xóa bác sĩ"
	case strings.Contains(path, "/nurses"):
		return "Xóa điều dưỡng"
	case strings.Contains(path, "/patients"):
		return "Xóa bệnh nhân"
	case strings.Contains(path, "/departments"):
		return "Xóa khoa/phòng"
	case strings.Contains(path, "/assignments"):
		return "Xóa phân công"
	case strings.Contains(path, "/thresholds"):
		return "Xóa ngưỡng cảnh báo"
	case strings.Contains(path, "/measurements"):
		return "Xóa chỉ số sức khỏe"
	case strings.Contains(path, "/prescriptions"):
		return "Xóa đơn thuốc"
	case strings.Contains(path, "/reminders"):
		return "Xóa nhắc nhở"
	case strings.Contains(path, "/follow-up-appointments"):
		return "Xóa lịch tái khám"
	case strings.Contains(path, "/alerts"):
		return "Xóa cảnh báo"
	default:
		return "Xóa: " + extractResource(path)
	}
}

// extractResource extracts the resource name from the path.
// Prefers clinical resource segments when nested under /users/...
func extractResource(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	preferred := []string{
		"measurements", "prescriptions", "medication-intakes", "alerts",
		"thresholds", "reminders", "follow-up-appointments", "messages",
		"chat", "video-sessions", "patients", "assignments", "departments",
		"doctors", "nurses",
	}
	for _, part := range parts {
		for _, name := range preferred {
			if part == name {
				return name
			}
		}
	}
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// extractResourceID extracts the resource ID from the path
func extractResourceID(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	// Look for MongoDB ObjectID pattern (24 hex characters)
	for _, part := range parts {
		if len(part) == 24 {
			if _, err := primitive.ObjectIDFromHex(part); err == nil {
				return part
			}
		}
	}
	return ""
}

func resolvePatientID(
	path, resource, resourceID string,
	metadata map[string]any,
	role domainUser.Role,
	actorID primitive.ObjectID,
) *primitive.ObjectID {
	if raw, ok := metadata["patientId"]; ok {
		if s, ok := raw.(string); ok {
			if id, err := primitive.ObjectIDFromHex(s); err == nil {
				return &id
			}
		}
	}

	// Patient self-service profile updates: /users/patients/me
	if role == domainUser.RolePatient && strings.Contains(path, "/patients/me") {
		id := actorID
		return &id
	}

	if resource == "patients" && resourceID != "" {
		if id, err := primitive.ObjectIDFromHex(resourceID); err == nil {
			return &id
		}
	}

	// /users/patients/:id/...
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i := 0; i+1 < len(parts); i++ {
		if parts[i] == "patients" && len(parts[i+1]) == 24 {
			if id, err := primitive.ObjectIDFromHex(parts[i+1]); err == nil {
				return &id
			}
		}
	}

	return nil
}

// metadataAllowlist is the only set of request-body keys retained in activity
// log metadata. Prefer IDs / status / scheduling flags over any PHI/PII values
// (name, email, vitals, medications, free-text notes, etc.).
var metadataAllowlist = map[string]struct{}{
	"status":           {},
	"role":             {},
	"name":             {},
	"patientId":        {},
	"doctorId":         {},
	"nurseId":          {},
	"departmentId":     {},
	"prescriptionId":   {},
	"conversationId":   {},
	"alertId":          {},
	"measurementId":    {},
	"assignmentId":     {},
	"reminderId":       {},
	"sessionId":        {},
	"kind":             {},
	"timezone":         {},
	"daysOfWeek":       {},
	"durationMinutes":  {},
	"platform":         {},
	"effectiveFrom":    {},
	"effectiveTo":      {},
	"startDate":        {},
	"endDate":          {},
	"scheduledAt":      {},
}

func sanitizeActivityMetadata(requestBody []byte) map[string]any {
	metadata := make(map[string]any)
	if len(requestBody) == 0 {
		return metadata
	}

	var bodyMap map[string]interface{}
	if err := json.Unmarshal(requestBody, &bodyMap); err != nil {
		return metadata
	}

	for key, value := range bodyMap {
		if _, ok := metadataAllowlist[key]; !ok {
			continue
		}
		// Nested objects/arrays may still carry PHI (e.g. medications[]) — drop them.
		switch value.(type) {
		case map[string]interface{}, []interface{}:
			continue
		default:
			metadata[key] = value
		}
	}
	return metadata
}

// enhanceActionMessage enhances action message with safe metadata only.
func enhanceActionMessage(action string, metadata map[string]any) string {
	status, ok := metadata["status"].(string)
	if !ok || status == "" || !strings.Contains(action, "Cập nhật") {
		return action
	}

	statusVN := status
	switch status {
	case "active":
		statusVN = "Kích hoạt"
	case "inactive":
		statusVN = "Vô hiệu hóa"
	}

	resource := ""
	switch {
	case strings.Contains(action, "bác sĩ"):
		resource = "bác sĩ"
	case strings.Contains(action, "điều dưỡng"):
		resource = "điều dưỡng"
	case strings.Contains(action, "bệnh nhân"):
		resource = "bệnh nhân"
	}
	if resource == "" {
		return action
	}
	return fmt.Sprintf("%s %s", statusVN, resource)
}

