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

// AssignPatient assigns a patient to a doctor or nurse.
// @Summary Assign patient to doctor/nurse
// @Description Create or update an assignment between a patient and medical staff
// @Tags assignments
// @Accept json
// @Produce json
// @Param body body dto.AssignPatientRequest true "Assignment info"
// @Success 201 {object} map[string]interface{} "Assignment created successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
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

func (h *AssignmentHandler) GetAllAssignments(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	res, err := h.service.GetAllAssignments(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}

func (h *AssignmentHandler) DeleteAssignment(c *gin.Context) {
	assignmentID := c.Param("id")
	if assignmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing assignment id"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.DeleteAssignmentByID(ctx, &usecase.DeleteAssignmentInput{AssignmentID: assignmentID}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Assignment deleted successfully"})
}
