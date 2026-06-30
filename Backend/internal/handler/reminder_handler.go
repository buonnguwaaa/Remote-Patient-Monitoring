package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type ReminderHandler struct {
	reminderService service.ReminderService
}

func NewReminderHandler(reminderService service.ReminderService) *ReminderHandler {
	return &ReminderHandler{
		reminderService: reminderService,
	}
}

// CreateReminder creates a new reminder
// @Summary Create a new reminder
// @Description Create a reminder for medication or measurement
// @Tags reminders
// @Accept json
// @Produce json
// @Param reminder body dto.CreateReminderRequest true "Reminder details"
// @Success 201 {object} map[string]interface{} "Reminder created successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /reminders [post]
func (h *ReminderHandler) CreateReminder(c *gin.Context) {
	var req dto.CreateReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	input := &usecase.CreateReminderInput{
		PatientID:  req.PatientID,
		Kind:       req.Kind,
		Message:    req.Message,
		Hour:       req.Hour,
		Minute:     req.Minute,
		DaysOfWeek: req.DaysOfWeek,
		Timezone:   req.Timezone,
		StartDate:  req.StartDate,
		EndDate:    req.EndDate,
		CreatedBy:  userID.(string),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	reminder, err := h.reminderService.CreateReminder(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": reminder, "message": "Tạo lời nhắc thành công"})
}

// GetReminders retrieves reminders based on filters
// @Summary Get reminders
// @Description Get reminders filtered by patient ID, status, or kind
// @Tags reminders
// @Accept json
// @Produce json
// @Param patientId query string false "Patient ID"
// @Param status query string false "Reminder status (active, paused, expired, canceled)"
// @Param kind query string false "Reminder kind (measure, medication)"
// @Success 200 {object} map[string]interface{} "Reminders retrieved successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /reminders [get]
func (h *ReminderHandler) GetReminders(c *gin.Context) {
	input := &usecase.GetRemindersInput{
		PatientID: c.Query("patientId"),
		Status:    domain.ReminderStatus(c.Query("status")),
		Kind:      domain.Kind(c.Query("kind")),
		IsLatest:  c.Query("latest") == "true",
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	reminders, err := h.reminderService.GetReminders(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": reminders, "message": "Lấy danh sách lời nhắc thành công"})
}

// UpdateReminderByID updates a reminder's status or message
// @Summary Update reminder
// @Description Update reminder status, message, or active state (doctor only)
// @Tags reminders
// @Accept json
// @Produce json
// @Param id path string true "Reminder ID"
// @Param update body dto.UpdateReminderRequest true "Update fields"
// @Success 200 {object} map[string]interface{} "Reminder updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Router /reminders/{id} [patch]
func (h *ReminderHandler) UpdateReminderByID(c *gin.Context) {
	reminderID := c.Param("id")

	var req dto.UpdateReminderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateReminderInput{
		ID:         reminderID,
		Message:    req.Message,
		Hour:       req.Hour,
		Minute:     req.Minute,
		DaysOfWeek: req.DaysOfWeek,
		Timezone:   req.Timezone,
		Status:     req.Status,
		StartDate:  req.StartDate,
		EndDate:    req.EndDate,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	reminder, err := h.reminderService.UpdateReminderByID(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": reminder, "message": "Cập nhật lời nhắc thành công"})
}

// UpdateReminderStatus updates only the status of a reminder
// @Summary Update reminder status
// @Description Update only the status of a reminder (active, paused, expired, canceled)
// @Tags reminders
// @Accept json
// @Produce json
// @Param id path string true "Reminder ID"
// @Param update body dto.UpdateReminderStatusRequest true "Status update"
// @Success 200 {object} map[string]interface{} "Reminder status updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Router /reminders/{id}/status [patch]
func (h *ReminderHandler) UpdateReminderStatus(c *gin.Context) {
	reminderID := c.Param("id")

	var req dto.UpdateReminderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateReminderStatusInput{
		ID:     reminderID,
		Status: req.Status,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	reminder, err := h.reminderService.UpdateReminderStatus(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": reminder, "message": "Cập nhật trạng thái lời nhắc thành công"})
}
