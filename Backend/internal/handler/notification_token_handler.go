package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type NotificationTokenHandler struct {
	notificationService service.NotificationService
}

func NewNotificationTokenHandler(notificationService service.NotificationService) *NotificationTokenHandler {
	return &NotificationTokenHandler{notificationService: notificationService}
}

// RegisterNotificationToken registers or updates a push notification token for the current user.
// @Summary Register notification token
// @Description Register or update an FCM notification token for the authenticated user and device
// @Tags notification-tokens
// @Accept json
// @Produce json
// @Param payload body dto.RegisterNotificationTokenRequest true "Notification token payload"
// @Success 200 {object} map[string]interface{} "Notification token registered successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /notification-tokens/register [post]
func (h *NotificationTokenHandler) RegisterNotificationToken(c *gin.Context) {
	var req dto.RegisterNotificationTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	registered, err := h.notificationService.RegisterToken(ctx, &usecase.RegisterNotificationTokenInput{
		UserID:   userID.(string),
		DeviceID: req.DeviceID,
		Platform: req.Platform,
		Provider: req.Provider,
		Token:    req.Token,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": registered, "message": "Notification token registered successfully"})
}

// DeactivateNotificationToken deactivates the current user's notification token for a device.
// @Summary Deactivate notification token
// @Description Deactivate the FCM notification token bound to the authenticated user and device during logout/device switch
// @Tags notification-tokens
// @Accept json
// @Produce json
// @Param payload body dto.DeactivateNotificationTokenRequest true "Notification token deactivate payload"
// @Success 200 {object} map[string]string "Notification token deactivated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /notification-tokens/deactivate [post]
func (h *NotificationTokenHandler) DeactivateNotificationToken(c *gin.Context) {
	var req dto.DeactivateNotificationTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.notificationService.DeactivateToken(ctx, &usecase.DeactivateNotificationTokenInput{
		UserID:   userID.(string),
		DeviceID: req.DeviceID,
	}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification token deactivated successfully"})
}
