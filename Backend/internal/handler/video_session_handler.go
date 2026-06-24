package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VideoSessionHandler handles HTTP requests for video call sessions.
type VideoSessionHandler struct {
	videoService service.VideoSessionService
}

// NewVideoSessionHandler creates a new handler.
func NewVideoSessionHandler(videoService service.VideoSessionService) *VideoSessionHandler {
	return &VideoSessionHandler{videoService: videoService}
}

// getRoleFromContext extracts the user role from Gin context (set by JWTAuthMiddleware).
func getRoleFromContext(c *gin.Context) (userDomain.Role, bool) {
	roleVal, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return "", false
	}
	role, ok := roleVal.(userDomain.Role)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid role"})
		return "", false
	}
	return role, true
}

// handleVideoSessionError maps service errors to HTTP responses.
func handleVideoSessionError(c *gin.Context, err error) {
	switch err {
	case service.ErrVideoSessionNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case service.ErrVideoSessionForbidden:
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case service.ErrVideoSessionNotDoctor:
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case service.ErrVideoSessionNotAssigned:
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	case service.ErrVideoSessionAlreadyActive:
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case service.ErrVideoSessionExpired:
		c.JSON(http.StatusGone, gin.H{"error": err.Error()})
	case service.ErrVideoSessionBadStatus:
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}

// CreateVideoSession godoc
// @Summary Create a video session (doctor only)
// @Tags video
// @Accept json
// @Produce json
// @Param body body dto.CreateVideoSessionRequest true "Request"
// @Success 201 {object} map[string]interface{}
// @Router /video-sessions [post]
func (h *VideoSessionHandler) CreateVideoSession(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}
	role, ok := getRoleFromContext(c)
	if !ok {
		return
	}

	var req dto.CreateVideoSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	resp, err := h.videoService.CreateVideoSession(ctx, userID, role, &req)
	if err != nil {
		handleVideoSessionError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": resp, "message": "video session created"})
}

// GetActiveVideoSession godoc
// @Summary Get active session by conversationId or patientId
// @Tags video
// @Produce json
// @Param conversationId query string false "Conversation ID"
// @Param patientId query string false "Patient ID"
// @Success 200 {object} map[string]interface{}
// @Router /video-sessions/active [get]
func (h *VideoSessionHandler) GetActiveVideoSession(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	var conversationID *primitive.ObjectID
	if raw := c.Query("conversationId"); raw != "" {
		id, err := primitive.ObjectIDFromHex(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversationId"})
			return
		}
		conversationID = &id
	}

	var patientID *primitive.ObjectID
	if raw := c.Query("patientId"); raw != "" {
		id, err := primitive.ObjectIDFromHex(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patientId"})
			return
		}
		patientID = &id
	}

	if conversationID == nil && patientID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "conversationId or patientId is required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.videoService.GetActiveVideoSession(ctx, userID, conversationID, patientID)
	if err != nil {
		handleVideoSessionError(c, err)
		return
	}
	if resp == nil {
		c.JSON(http.StatusOK, gin.H{"data": nil, "message": "no active session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "ok"})
}

// GetVideoSession godoc
// @Summary Get a video session by ID
// @Tags video
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]interface{}
// @Router /video-sessions/{id} [get]
func (h *VideoSessionHandler) GetVideoSession(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	sessionID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.videoService.GetVideoSession(ctx, userID, sessionID)
	if err != nil {
		handleVideoSessionError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "ok"})
}

// JoinVideoSession godoc
// @Summary Join a video session (returns joinUrl for authorized participants only)
// @Tags video
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]interface{}
// @Router /video-sessions/{id}/join [post]
func (h *VideoSessionHandler) JoinVideoSession(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}
	role, ok := getRoleFromContext(c)
	if !ok {
		return
	}

	sessionID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.videoService.JoinVideoSession(ctx, userID, role, sessionID)
	if err != nil {
		handleVideoSessionError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "joined"})
}

// EndVideoSession godoc
// @Summary End a video session
// @Tags video
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]interface{}
// @Router /video-sessions/{id}/end [post]
func (h *VideoSessionHandler) EndVideoSession(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	sessionID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.videoService.EndVideoSession(ctx, userID, sessionID)
	if err != nil {
		handleVideoSessionError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "session ended"})
}

// RejectVideoSession godoc
// @Summary Reject a video session (patient/participant only)
// @Tags video
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]interface{}
// @Router /video-sessions/{id}/reject [post]
func (h *VideoSessionHandler) RejectVideoSession(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	sessionID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.videoService.RejectVideoSession(ctx, userID, sessionID)
	if err != nil {
		handleVideoSessionError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "session rejected"})
}
