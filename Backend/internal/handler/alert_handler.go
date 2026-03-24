package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
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

// GetAlerts handles retrieving alerts based on query parameters
// @Summary Get alerts
// @Description Retrieve alerts based on query parameters
// @Tags alerts
// @Accept json
// @Produce json
// @Param patientId query string false "Patient ID"
// @Param status query string false "Alert status"
// @Param severity query string false "Alert severity"
// @Param isLatest query bool false "Is latest alert"
// @Success 200 {object} map[string]interface{} "Alerts retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /alerts [get]
func (h *AlertHandler) GetAlerts(c *gin.Context) {
	doctorID := ""
	if roleValue, exists := c.Get("role"); exists {
		if role, ok := roleValue.(userDomain.Role); ok && role == userDomain.RoleDoctor {
			if userID, userExists := c.Get("userId"); userExists {
				doctorID, _ = userID.(string)
			}
		}
	}

	input := &usecase.GetAlertsInput{
		PatientID: c.Query("patientId"),
		DoctorID:  doctorID,
		Status:    c.Query("status"),
		Severity:  c.Query("severity"),
		IsLatest:  c.Query("isLatest") == "true",
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	alerts, err := h.alertService.GetAlerts(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts, "message": "Alerts retrieved successfully"})
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
// @Router /alerts/{id} [patch]
func (h *AlertHandler) UpdateAlertAcknowledgementByID(c *gin.Context) {
	doctorId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
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
			c.JSON(http.StatusNotFound, gin.H{"error": "alert not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if updatedAlert == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "alert not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updatedAlert, "message": "Alert acknowledged successfully"})
}
