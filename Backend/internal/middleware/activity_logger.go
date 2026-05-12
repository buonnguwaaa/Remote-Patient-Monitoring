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

// LogActivity logs admin activities
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
			log.Printf("[ActivityLogger] Detected login request")
			m.logLoginActivity(c, requestBody)
			return
		}

		// For all other endpoints, require authentication
		userIDStr, userIDExists := c.Get("userId")
		roleVal, roleExists := c.Get("role")

		if !roleExists || !userIDExists {
			log.Printf("[ActivityLogger] Skipping - no userId or role in context for path: %s", c.Request.URL.Path)
			return
		}

		role, ok := roleVal.(domainUser.Role)
		if !ok || role != domainUser.RoleAdmin {
			log.Printf("[ActivityLogger] Skipping - user is not admin (role: %v) for path: %s", roleVal, c.Request.URL.Path)
			return
		}

		log.Printf("[ActivityLogger] Logging activity for admin user: %s, path: %s", userIDStr, c.Request.URL.Path)

		userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
		if err != nil {
			log.Printf("[ActivityLogger] Error parsing userID: %v", err)
			return
		}

		// Get user name from database
		userName := "Admin"
		if user, err := m.baseUserRepo.FindByID(c.Request.Context(), userID); err == nil && user != nil {
			userName = user.Name
		}

		// Determine activity type and action
		activityType, action := determineActivityTypeAndAction(c.Request.Method, c.Request.URL.Path, c.Writer.Status())

		// Add metadata for certain operations
		metadata := make(map[string]any)
		if len(requestBody) > 0 {
			var bodyMap map[string]interface{}
			if err := json.Unmarshal(requestBody, &bodyMap); err == nil {
				// Only store non-sensitive data
				for key, value := range bodyMap {
					// Skip sensitive fields
					if !isSensitiveField(key) {
						metadata[key] = value
					}
				}
			}
		}

		// Skip if request only contains status field (status updates are logged with main update)
		if len(metadata) == 1 {
			if _, hasStatus := metadata["status"]; hasStatus {
				log.Printf("[ActivityLogger] Skipping status-only update for path: %s", c.Request.URL.Path)
				return
			}
		}

		// Enhance action message with metadata
		if len(metadata) > 0 {
			action = enhanceActionMessage(action, metadata)
		}

		// Create activity log
		activityLog := &domain.ActivityLog{
			ID:         primitive.NewObjectID(),
			UserID:     userID,
			UserName:   userName,
			UserRole:   string(role),
			Type:       activityType,
			Action:     action,
			Resource:   extractResource(c.Request.URL.Path),
			ResourceID: extractResourceID(c.Request.URL.Path),
			Method:     c.Request.Method,
			Path:       c.Request.URL.Path,
			IPAddress:  c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
			StatusCode: c.Writer.Status(),
			CreatedAt:  time.Now(),
		}

		// Add metadata if not empty
		if len(metadata) > 0 {
			activityLog.Metadata = metadata
		}

		// Save log synchronously to ensure it's saved
		if err := m.repo.Create(c.Request.Context(), activityLog); err != nil {
			// Log error but don't fail the request
			log.Printf("[ActivityLogger] Error saving activity log: %v", err)
			_ = c.Error(err)
		} else {
			log.Printf("[ActivityLogger] Successfully saved activity log: %s - %s", userName, action)
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
		log.Printf("[ActivityLogger] Login - failed to parse email from request body: %v", err)
		return
	}

	log.Printf("[ActivityLogger] Login - looking up user by email: %s", loginReq.Email)

	// Find user by email to get user info
	user, err := m.baseUserRepo.FindByEmail(c.Request.Context(), loginReq.Email)
	if err != nil || user == nil {
		log.Printf("[ActivityLogger] Login - user not found: %v", err)
		return
	}

	log.Printf("[ActivityLogger] Login - found user: %s, role: %s", user.Name, user.Role)

	// Only log admin logins
	if user.Role != domainUser.RoleAdmin {
		log.Printf("[ActivityLogger] Login - user is not admin, skipping")
		return
	}

	// Create activity log
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

	// Save log synchronously for login to ensure it's saved
	if err := m.repo.Create(c.Request.Context(), activityLog); err != nil {
		// Log error but don't fail the request
		log.Printf("[ActivityLogger] Login - error saving activity log: %v", err)
		_ = c.Error(err)
	} else {
		log.Printf("[ActivityLogger] Login - successfully saved activity log for: %s", user.Name)
	}
}

// shouldSkipLogging determines if a path should be skipped from logging
func shouldSkipLogging(path string) bool {
	skipPaths := []string{
		"/activity-logs",
		"/auth/me",
		"/health",
		"/metrics",
		"/swagger",
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
	if strings.Contains(path, "/doctors") {
		return "Thêm bác sĩ mới"
	} else if strings.Contains(path, "/nurses") {
		return "Thêm y tá mới"
	} else if strings.Contains(path, "/patients") {
		return "Thêm bệnh nhân mới"
	} else if strings.Contains(path, "/departments") {
		if strings.Contains(path, "/members") {
			return "Thêm thành viên vào khoa/phòng"
		}
		return "Tạo khoa/phòng mới"
	} else if strings.Contains(path, "/assignments") {
		return "Tạo phân công mới"
	} else if strings.Contains(path, "/thresholds") {
		return "Tạo ngưỡng cảnh báo mới"
	}
	return "Tạo mới: " + extractResource(path)
}

// generateUpdateAction generates a human-readable update action
func generateUpdateAction(path string) string {
	if strings.Contains(path, "/doctors") {
		return "Cập nhật thông tin bác sĩ"
	} else if strings.Contains(path, "/nurses") {
		return "Cập nhật thông tin y tá"
	} else if strings.Contains(path, "/patients") {
		return "Cập nhật thông tin bệnh nhân"
	} else if strings.Contains(path, "/departments") {
		return "Cập nhật thông tin khoa/phòng"
	} else if strings.Contains(path, "/assignments") {
		return "Cập nhật phân công"
	} else if strings.Contains(path, "/thresholds") {
		return "Cập nhật ngưỡng cảnh báo"
	} else if strings.Contains(path, "/status") {
		return "Cập nhật trạng thái"
	}
	return "Cập nhật: " + extractResource(path)
}

// generateDeleteAction generates a human-readable delete action
func generateDeleteAction(path string) string {
	if strings.Contains(path, "/doctors") {
		return "Xóa bác sĩ"
	} else if strings.Contains(path, "/nurses") {
		return "Xóa y tá"
	} else if strings.Contains(path, "/patients") {
		return "Xóa bệnh nhân"
	} else if strings.Contains(path, "/departments") {
		return "Xóa khoa/phòng"
	} else if strings.Contains(path, "/assignments") {
		return "Xóa phân công"
	} else if strings.Contains(path, "/thresholds") {
		return "Xóa ngưỡng cảnh báo"
	}
	return "Xóa: " + extractResource(path)
}

// extractResource extracts the resource name from the path
func extractResource(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
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

// isSensitiveField checks if a field name is sensitive
func isSensitiveField(fieldName string) bool {
	sensitiveFields := []string{
		"password",
		"confirmedPassword",
		"token",
		"refreshToken",
		"secret",
		"apiKey",
		"accessToken",
	}

	fieldLower := strings.ToLower(fieldName)
	for _, sensitive := range sensitiveFields {
		if strings.Contains(fieldLower, strings.ToLower(sensitive)) {
			return true
		}
	}

	return false
}

// enhanceActionMessage enhances action message with metadata information
func enhanceActionMessage(action string, metadata map[string]any) string {
	// Add name to action if available
	if name, ok := metadata["name"].(string); ok && name != "" {
		if strings.Contains(action, "Thêm bác sĩ") {
			return fmt.Sprintf("Thêm bác sĩ: %s", name)
		} else if strings.Contains(action, "Thêm y tá") {
			return fmt.Sprintf("Thêm y tá: %s", name)
		} else if strings.Contains(action, "Thêm bệnh nhân") {
			return fmt.Sprintf("Thêm bệnh nhân: %s", name)
		} else if strings.Contains(action, "Cập nhật thông tin bác sĩ") {
			return fmt.Sprintf("Cập nhật thông tin bác sĩ: %s", name)
		} else if strings.Contains(action, "Cập nhật thông tin y tá") {
			return fmt.Sprintf("Cập nhật thông tin y tá: %s", name)
		} else if strings.Contains(action, "Cập nhật thông tin bệnh nhân") {
			return fmt.Sprintf("Cập nhật thông tin bệnh nhân: %s", name)
		}
	}

	// Check for status update
	if status, ok := metadata["status"].(string); ok && status != "" {
		if strings.Contains(action, "Cập nhật") {
			statusVN := status
			if status == "active" {
				statusVN = "Kích hoạt"
			} else if status == "inactive" {
				statusVN = "Vô hiệu hóa"
			}

			resource := ""
			if strings.Contains(action, "bác sĩ") {
				resource = "bác sĩ"
			} else if strings.Contains(action, "y tá") {
				resource = "y tá"
			} else if strings.Contains(action, "bệnh nhân") {
				resource = "bệnh nhân"
			}

			if resource != "" {
				if name, ok := metadata["name"].(string); ok && name != "" {
					return fmt.Sprintf("%s %s: %s", statusVN, resource, name)
				}
				return fmt.Sprintf("%s %s", statusVN, resource)
			}
		}
	}

	return action
}
