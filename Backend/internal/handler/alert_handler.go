package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type AlertHandler struct {
	alertService service.AlertService
}

func NewAlertHandler(alertService service.AlertService) *AlertHandler {
	return &AlertHandler{
		alertService: alertService,
	}
}

// GetDoctorAlerts handles retrieving all alerts for patients managed by the authenticated doctor
// @Summary Get doctor patient alerts
// @Description Retrieve all alerts for patients assigned to the authenticated doctor
// @Tags alerts
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Alerts retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /alerts/doctors/me [get]
func (h *AlertHandler) GetDoctorAlerts(c *gin.Context) {
	doctorID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit
	sortOrder := c.DefaultQuery("sortOrder", "desc")

	input := &usecase.GetAlertsInput{
		DoctorID:  doctorID.(string),
		Status:    c.Query("status"),
		Severity:  c.Query("severity"),
		IsLatest:  c.Query("isLatest") == "true",
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: sortOrder,
	}
	alerts, err := h.alertService.GetDoctorAlerts(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts, "message": "Lấy danh sách cảnh báo thành công"})
}

// GetNurseAlerts handles retrieving all alerts for patients managed by the authenticated nurse
// @Summary Get nurse patient alerts
// @Description Retrieve all alerts for patients assigned to the authenticated nurse
// @Tags alerts
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Alerts retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /alerts/nurses/me [get]
func (h *AlertHandler) GetNurseAlerts(c *gin.Context) {
	nurseID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit
	sortOrder := c.DefaultQuery("sortOrder", "desc")

	input := &usecase.GetAlertsInput{
		NurseID:   nurseID.(string),
		PatientID: c.Query("patientId"),
		Status:    c.Query("status"),
		Severity:  c.Query("severity"),
		IsLatest:  c.Query("isLatest") == "true",
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: sortOrder,
	}
	alerts, err := h.alertService.GetNurseAlerts(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts, "message": "Lấy danh sách cảnh báo thành công"})
}

// GetPatientAlerts handles retrieving all alerts for the authenticated patient
// @Summary Get patient alerts
// @Description Retrieve all alerts for the authenticated patient
// @Tags alerts
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Alerts retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /alerts/patients/me [get]
func (h *AlertHandler) GetPatientAlerts(c *gin.Context) {
	patientID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit
	sortOrder := c.DefaultQuery("sortOrder", "desc")

	input := &usecase.GetAlertsInput{
		PatientID: patientID.(string),
		Status:    c.Query("status"),
		Severity:  c.Query("severity"),
		IsLatest:  c.Query("isLatest") == "true",
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: sortOrder,
	}
	alerts, err := h.alertService.GetPatientAlerts(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts, "message": "Lấy danh sách cảnh báo thành công"})
}

// GetAlertByID handles retrieving an alert by its ID
// @Summary Get an alert by ID
// @Description Retrieve an alert by its ID
// @Tags alerts
// @Accept json
// @Produce json
// @Param id path string true "Alert ID"
// @Success 200 {object} map[string]interface{} "Alert retrieved successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Alert not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /alerts/{id} [get]
func (h *AlertHandler) GetAlertByID(c *gin.Context) {
	alertId := c.Param("id")

	input := &usecase.GetAlertByIDInput{
		ID: alertId,
	}

	alert, err := h.alertService.GetAlertByID(c.Request.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrAlertNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAlertNotFound})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if alert == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAlertNotFound})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alert, "message": "Lấy cảnh báo thành công"})
}

// UpdateAlertAcknowledgementByID handles updating the acknowledgement of an alert by its ID
// @Summary Acknowledge an alert
// @Description Update the acknowledgement of an alert by its ID
// @Tags alerts
// @Accept json
// @Produce json
// @Param id path string true "Alert ID"
// @Success 200 {object} map[string]interface{} "Alert acknowledged successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Alert not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /alerts/ack/{id} [patch]
func (h *AlertHandler) UpdateAlertAcknowledgementByID(c *gin.Context) {
	doctorId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	alertId := c.Param("id")
	input := &usecase.UpdateAlertAcknowledgementByIDInput{
		AlertID:        alertId,
		AcknowledgedBy: doctorId.(string),
	}

	updatedAlert, err := h.alertService.UpdateAlertAcknowledgementByID(c.Request.Context(), input)
	if err != nil {
		if errors.Is(err, service.ErrAlertNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAlertNotFound})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if updatedAlert == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAlertNotFound})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updatedAlert, "message": "Đã xác nhận cảnh báo thành công"})
}
