package handler

import (
	"context"
	"net/http"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
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
// @Param body body dto.AssignPatientRequest true "Assignment info"
// @Success 201 {object} map[string]interface{}
// @Router /assignments/assign [post]
func (h *AssignmentHandler) AssignPatient(c *gin.Context) {
	var req dto.AssignPatientRequest
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

	// Map DTO to usecase input
	input := &usecase.AssignPatientInput{
		PatientID:  req.PatientID,
		DoctorID:   req.DoctorID,
		NurseID:    req.NurseID,
		AssignedBy: adminID.(string),
	}

	res, err := h.service.AssignPatient(ctx, input)
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
// @Router /assignments [get]
func (h *AssignmentHandler) GetMyAssignments(c *gin.Context) {
	userID, exists := c.Get("userId")
	role, existsRole := c.Get("role")

	if !exists || !existsRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	roleVal := role.(domain.Role)

	// Only doctor or nurse can see their assignments
	if roleVal != domain.RoleDoctor && roleVal != domain.RoleNurse {
		c.JSON(http.StatusForbidden, gin.H{"error": "only doctor or nurse can see assigned patients"})
		return
	}

	input := &usecase.GetAssignmentsByRoleInput{
		UserID: userID.(string),
		Role:   roleVal,
	}

	res, err := h.service.GetAssignmentsByRole(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}
