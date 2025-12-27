package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type AssignmentHandler struct {
	service service.AssignmentService
}

func NewAssignmentHandler(service service.AssignmentService) *AssignmentHandler {
	return &AssignmentHandler{
		service: service,
	}
}

// @Summary Assign patient to doctor/nurse
// @Tags assignments
// @Accept json
// @Produce json
// @Param body body usecase.AssignPatientInput true "Assignment info"
// @Success 201 {object} map[string]interface{}
// @Router /assignments/assign [post]
func (h *AssignmentHandler) AssignPatient(c *gin.Context) {
	var req usecase.AssignPatientInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	res, err := h.service.AssignPatient(ctx, &req, adminID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": res})
}

// @Summary Get assignments for the current doctor/nurse
// @Tags assignments
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /assignments/my [get]
func (h *AssignmentHandler) GetMyAssignments(c *gin.Context) {
	userID, exists := c.Get("userId")
	role, existsRole := c.Get("role")

	if !exists || !existsRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	var res []*usecase.AssignmentResponse
	var err error

	// Check if role is string or domain.Role
	roleVal := role.(domain.Role)

	if roleVal == domain.RoleDoctor {
		res, err = h.service.GetAssignmentsByDoctor(ctx, userID.(string))
	} else if roleVal == domain.RoleNurse {
		res, err = h.service.GetAssignmentsByNurse(ctx, userID.(string))
	} else {
		// Admin might want to see all or irrelevant here for "my"
		c.JSON(http.StatusForbidden, gin.H{"error": "only doctor or nurse can see assigned patients"})
		return
	}

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}
