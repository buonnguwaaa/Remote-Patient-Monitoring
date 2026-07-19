package handler

import (
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	domainUser "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ActivityLogHandler struct {
	repo           *repository.ActivityLogRepository
	assignmentRepo repository.AssignmentRepository
}

func NewActivityLogHandler(
	repo *repository.ActivityLogRepository,
	assignmentRepo repository.AssignmentRepository,
) *ActivityLogHandler {
	return &ActivityLogHandler{
		repo:           repo,
		assignmentRepo: assignmentRepo,
	}
}

// GetActivityLogs godoc
// @Summary Get activity logs
// @Description Get activity logs with optional filters (admin)
// @Tags activity-logs
// @Accept json
// @Produce json
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Param type query string false "Activity type (login, create, update, delete, system, all)"
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Page size" default(50)
// @Success 200 {object} dto.ActivityLogListResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /activity-logs [get]
// @Security BearerAuth
func (h *ActivityLogHandler) GetActivityLogs(c *gin.Context) {
	var params dto.ActivityLogQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if params.Page == 0 {
		params.Page = 1
	}
	if params.PageSize == 0 {
		params.PageSize = 50
	}

	startDate, endDate, ok := parseActivityDateRange(c, params.StartDate, params.EndDate)
	if !ok {
		return
	}

	skip := (params.Page - 1) * params.PageSize

	logs, err := h.repo.FindByDateRange(c.Request.Context(), startDate, endDate, params.ActivityType, params.PageSize, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedFetchActivityLogs})
		return
	}

	total, err := h.repo.CountByDateRange(c.Request.Context(), startDate, endDate, params.ActivityType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedCountActivityLogs})
		return
	}

	// Convert to response DTOs
	var responseLogs []dto.ActivityLogResponse
	for _, log := range logs {
		responseLogs = append(responseLogs, dto.ActivityLogResponse{
			ID:         log.ID.Hex(),
			UserID:     log.UserID.Hex(),
			UserName:   log.UserName,
			UserRole:   log.UserRole,
			Type:       string(log.Type),
			Action:     log.Action,
			Resource:   log.Resource,
			ResourceID: log.ResourceID,
			Method:     log.Method,
			Path:       log.Path,
			IPAddress:  log.IPAddress,
			UserAgent:  log.UserAgent,
			StatusCode: log.StatusCode,
			ErrorMsg:   log.ErrorMsg,
			Metadata:   log.Metadata,
			CreatedAt:  log.CreatedAt,
			Timestamp:  log.CreatedAt.Format("15:04"),
			Date:       log.CreatedAt.Format("2006-01-02"),
		})
	}

	c.JSON(http.StatusOK, dto.ActivityLogListResponse{
		Data:       responseLogs,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages(total, params.PageSize),
	})
}

// GetActivityLogStats godoc
// @Summary Get activity log statistics
// @Description Get statistics for activity logs within a date range (admin)
// @Tags activity-logs
// @Accept json
// @Produce json
// @Param startDate query string false "Start date (YYYY-MM-DD)"
// @Param endDate query string false "End date (YYYY-MM-DD)"
// @Success 200 {object} dto.ActivityLogStatsResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /activity-logs/stats [get]
// @Security BearerAuth
func (h *ActivityLogHandler) GetActivityLogStats(c *gin.Context) {
	startDate, endDate, ok := parseActivityDateRange(c, c.Query("startDate"), c.Query("endDate"))
	if !ok {
		return
	}

	stats, err := h.repo.GetStatsByDateRange(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedFetchStatistics})
		return
	}

	var total int64
	for _, count := range stats {
		total += count
	}

	c.JSON(http.StatusOK, dto.ActivityLogStatsResponse{
		Total:  total,
		ByType: stats,
	})
}

// GetClinicalHistory godoc
// @Summary Clinical history for an assigned patient
// @Description Doctor/nurse view of who created/updated measurements, prescriptions, alerts, etc. on a patient they are assigned to
// @Tags activity-logs
// @Produce json
// @Param patientId query string true "Patient ID"
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Page size" default(50)
// @Success 200 {object} dto.ClinicalHistoryListResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Router /activity-logs/clinical [get]
// @Security BearerAuth
func (h *ActivityLogHandler) GetClinicalHistory(c *gin.Context) {
	var params dto.ClinicalHistoryQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "patientId là bắt buộc"})
		return
	}
	if params.Page == 0 {
		params.Page = 1
	}
	if params.PageSize == 0 {
		params.PageSize = 50
	}

	patientID, err := primitive.ObjectIDFromHex(params.PatientID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidPatientID})
		return
	}

	staffIDStr, _ := c.Get("userId")
	staffID, err := primitive.ObjectIDFromHex(staffIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	hasAssignment, err := h.assignmentRepo.HasAssignmentRecordForPair(c.Request.Context(), staffID, patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedFetchActivityLogs})
		return
	}
	if !hasAssignment {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bạn không được phân công phụ trách bệnh nhân này"})
		return
	}

	skip := (params.Page - 1) * params.PageSize
	logs, err := h.repo.FindByPatientID(c.Request.Context(), patientID, repository.ClinicalResources, params.PageSize, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedFetchActivityLogs})
		return
	}
	total, err := h.repo.CountByPatientID(c.Request.Context(), patientID, repository.ClinicalResources)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedCountActivityLogs})
		return
	}

	items := make([]dto.ClinicalHistoryItem, 0, len(logs))
	for _, logEntry := range logs {
		item := dto.ClinicalHistoryItem{
			ID:         logEntry.ID.Hex(),
			ActorName:  logEntry.UserName,
			ActorRole:  logEntry.UserRole,
			Action:     logEntry.Action,
			Resource:   logEntry.Resource,
			ResourceID: logEntry.ResourceID,
			CreatedAt:  logEntry.CreatedAt,
			Timestamp:  logEntry.CreatedAt.Format("15:04"),
			Date:       logEntry.CreatedAt.Format("2006-01-02"),
		}
		if logEntry.PatientID != nil {
			item.PatientID = logEntry.PatientID.Hex()
		}
		items = append(items, item)
	}

	c.JSON(http.StatusOK, dto.ClinicalHistoryListResponse{
		Data:       items,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages(total, params.PageSize),
	})
}

// GetMyAccountActivity godoc
// @Summary My activity
// @Description Patient: who updated my chart. Doctor/nurse: my own clinical write actions across assigned patients.
// @Tags activity-logs
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param pageSize query int false "Page size" default(50)
// @Success 200 {object} dto.AccountActivityListResponse
// @Success 200 {object} dto.ClinicalHistoryListResponse
// @Failure 401 {object} map[string]string
// @Router /activity-logs/me [get]
// @Security BearerAuth
func (h *ActivityLogHandler) GetMyAccountActivity(c *gin.Context) {
	var params dto.AccountActivityQueryParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if params.Page == 0 {
		params.Page = 1
	}
	if params.PageSize == 0 {
		params.PageSize = 50
	}

	userIDStr, _ := c.Get("userId")
	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	roleVal, _ := c.Get("role")
	role, _ := roleVal.(domainUser.Role)
	skip := (params.Page - 1) * params.PageSize

	// Doctor/nurse: activity they themselves performed (clinical writes).
	if role == domainUser.RoleDoctor || role == domainUser.RoleNurse {
		logs, err := h.repo.FindByUserID(c.Request.Context(), userID, repository.ClinicalResources, params.PageSize, skip)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedFetchActivityLogs})
			return
		}
		total, err := h.repo.CountByUserID(c.Request.Context(), userID, repository.ClinicalResources)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedCountActivityLogs})
			return
		}

		items := make([]dto.ClinicalHistoryItem, 0, len(logs))
		for _, logEntry := range logs {
			item := dto.ClinicalHistoryItem{
				ID:         logEntry.ID.Hex(),
				ActorName:  "Bạn",
				ActorRole:  logEntry.UserRole,
				Action:     logEntry.Action,
				Resource:   logEntry.Resource,
				ResourceID: logEntry.ResourceID,
				CreatedAt:  logEntry.CreatedAt,
				Timestamp:  logEntry.CreatedAt.Format("15:04"),
				Date:       logEntry.CreatedAt.Format("2006-01-02"),
			}
			if logEntry.PatientID != nil {
				item.PatientID = logEntry.PatientID.Hex()
			}
			items = append(items, item)
		}

		c.JSON(http.StatusOK, dto.ClinicalHistoryListResponse{
			Data:       items,
			Total:      total,
			Page:       params.Page,
			PageSize:   params.PageSize,
			TotalPages: totalPages(total, params.PageSize),
		})
		return
	}

	// Patient: events on my chart (any actor).
	logs, err := h.repo.FindByPatientID(c.Request.Context(), userID, repository.AccountActivityResources, params.PageSize, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedFetchActivityLogs})
		return
	}
	total, err := h.repo.CountByPatientID(c.Request.Context(), userID, repository.AccountActivityResources)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgFailedCountActivityLogs})
		return
	}

	items := make([]dto.AccountActivityItem, 0, len(logs))
	for _, logEntry := range logs {
		actorName := logEntry.UserName
		if logEntry.UserID == userID {
			actorName = "Bạn"
		}
		items = append(items, dto.AccountActivityItem{
			ID:        logEntry.ID.Hex(),
			ActorName: actorName,
			ActorRole: friendlyActorRole(logEntry.UserRole),
			Action:    logEntry.Action,
			CreatedAt: logEntry.CreatedAt,
			Timestamp: logEntry.CreatedAt.Format("15:04"),
			Date:      logEntry.CreatedAt.Format("2006-01-02"),
		})
	}

	c.JSON(http.StatusOK, dto.AccountActivityListResponse{
		Data:       items,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages(total, params.PageSize),
	})
}

func parseActivityDateRange(c *gin.Context, startDateStr, endDateStr string) (time.Time, time.Time, bool) {
	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidFromDate})
			return time.Time{}, time.Time{}, false
		}
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	} else {
		startDate = time.Now().AddDate(0, 0, -30)
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidToDate})
			return time.Time{}, time.Time{}, false
		}
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	} else {
		endDate = time.Now()
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	}

	return startDate, endDate, true
}

func toAdminActivityLogResponse(logEntry *domain.ActivityLog) dto.ActivityLogResponse {
	resp := dto.ActivityLogResponse{
		ID:         logEntry.ID.Hex(),
		UserID:     logEntry.UserID.Hex(),
		UserName:   logEntry.UserName,
		UserRole:   logEntry.UserRole,
		Type:       string(logEntry.Type),
		Action:     logEntry.Action,
		Resource:   logEntry.Resource,
		ResourceID: logEntry.ResourceID,
		Method:     logEntry.Method,
		Path:       logEntry.Path,
		IPAddress:  logEntry.IPAddress,
		StatusCode: logEntry.StatusCode,
		ErrorMsg:   logEntry.ErrorMsg,
		Metadata:   logEntry.Metadata,
		CreatedAt:  logEntry.CreatedAt,
		Timestamp:  logEntry.CreatedAt.Format("15:04"),
		Date:       logEntry.CreatedAt.Format("2006-01-02"),
	}
	if logEntry.PatientID != nil {
		resp.PatientID = logEntry.PatientID.Hex()
	}
	return resp
}

func totalPages(total int64, pageSize int) int {
	pages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		pages++
	}
	return pages
}

func friendlyActorRole(role string) string {
	switch domainUser.Role(role) {
	case domainUser.RoleDoctor:
		return "Bác sĩ"
	case domainUser.RoleNurse:
		return "Điều dưỡng"
	case domainUser.RolePatient:
		return "Bạn"
	case domainUser.RoleAdmin:
		return "Quản trị"
	default:
		return role
	}
}
