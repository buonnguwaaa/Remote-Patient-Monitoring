package handler

import (
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type ActivityLogHandler struct {
	repo *repository.ActivityLogRepository
}

func NewActivityLogHandler(repo *repository.ActivityLogRepository) *ActivityLogHandler {
	return &ActivityLogHandler{
		repo: repo,
	}
}

// GetActivityLogs godoc
// @Summary Get activity logs
// @Description Get activity logs with optional filters
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

	// Set defaults
	if params.Page == 0 {
		params.Page = 1
	}
	if params.PageSize == 0 {
		params.PageSize = 50
	}

	// Parse dates
	var startDate, endDate time.Time
	var err error

	if params.StartDate != "" {
		startDate, err = time.Parse("2006-01-02", params.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
			return
		}
		// Set to start of day
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	} else {
		// Default to 30 days ago
		startDate = time.Now().AddDate(0, 0, -30)
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	}

	if params.EndDate != "" {
		endDate, err = time.Parse("2006-01-02", params.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
			return
		}
		// Set to end of day
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	} else {
		// Default to today
		endDate = time.Now()
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	}

	// Calculate skip
	skip := (params.Page - 1) * params.PageSize

	// Fetch logs
	logs, err := h.repo.FindByDateRange(c.Request.Context(), startDate, endDate, params.ActivityType, params.PageSize, skip)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity logs"})
		return
	}

	// Get total count
	total, err := h.repo.CountByDateRange(c.Request.Context(), startDate, endDate, params.ActivityType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count activity logs"})
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
			StatusCode: log.StatusCode,
			ErrorMsg:   log.ErrorMsg,
			Metadata:   log.Metadata,
			CreatedAt:  log.CreatedAt,
			Timestamp:  log.CreatedAt.Format("15:04"),
			Date:       log.CreatedAt.Format("2006-01-02"),
		})
	}

	// Calculate total pages
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, dto.ActivityLogListResponse{
		Data:       responseLogs,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	})
}

// GetActivityLogStats godoc
// @Summary Get activity log statistics
// @Description Get statistics for activity logs within a date range
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
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format. Use YYYY-MM-DD"})
			return
		}
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	} else {
		startDate = time.Now().AddDate(0, 0, -30)
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format. Use YYYY-MM-DD"})
			return
		}
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	} else {
		endDate = time.Now()
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 999999999, endDate.Location())
	}

	// Get statistics
	stats, err := h.repo.GetStatsByDateRange(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch statistics"})
		return
	}

	// Calculate total
	var total int64
	for _, count := range stats {
		total += count
	}

	c.JSON(http.StatusOK, dto.ActivityLogStatsResponse{
		Total:  total,
		ByType: stats,
	})
}

// CleanupAccessLogs godoc
// @Summary Clean up access logs
// @Description Delete all system logs with "Truy cập:" action (GET request logs)
// @Tags activity-logs
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Router /activity-logs/cleanup-access [delete]
// @Security BearerAuth
func (h *ActivityLogHandler) CleanupAccessLogs(c *gin.Context) {
	deletedCount, err := h.repo.DeleteAccessLogs(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup access logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Access logs cleaned up successfully",
		"deleted": deletedCount,
	})
}

// DeleteActivityLog godoc
// @Summary Delete a specific activity log
// @Description Delete an activity log by ID
// @Tags activity-logs
// @Accept json
// @Produce json
// @Param id path string true "Activity Log ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /activity-logs/{id} [delete]
// @Security BearerAuth
func (h *ActivityLogHandler) DeleteActivityLog(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Activity log ID is required"})
		return
	}

	err := h.repo.DeleteByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete activity log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Activity log deleted successfully",
	})
}
