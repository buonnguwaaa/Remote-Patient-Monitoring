package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type FollowUpAppointmentHandler struct {
	appointmentService service.FollowUpAppointmentService
}

func NewFollowUpAppointmentHandler(appointmentService service.FollowUpAppointmentService) *FollowUpAppointmentHandler {
	return &FollowUpAppointmentHandler{
		appointmentService: appointmentService,
	}
}

// CreateFollowUpAppointment schedules a follow-up appointment for a patient
// @Summary Create follow-up appointment
// @Description Doctor schedules a follow-up appointment for an assigned patient
// @Tags appointments
// @Accept json
// @Produce json
// @Param appointment body dto.CreateFollowUpAppointmentRequest true "Appointment details"
// @Success 201 {object} map[string]interface{} "Appointment created successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /appointments [post]
func (h *FollowUpAppointmentHandler) CreateFollowUpAppointment(c *gin.Context) {
	var req dto.CreateFollowUpAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	input := &usecase.CreateFollowUpAppointmentInput{
		PatientID:       req.PatientID,
		DoctorID:        req.DoctorID,
		ScheduledAt:     req.ScheduledAt,
		DurationMinutes: req.DurationMinutes,
		Timezone:        req.Timezone,
		Location:        req.Location,
		Notes:           req.Notes,
		CreatedBy:       userID.(string),
	}

	if roleVal, roleExists := c.Get("role"); roleExists {
		if role, ok := roleVal.(userDomain.Role); ok {
			input.ActorRole = role
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	appointment, err := h.appointmentService.CreateFollowUpAppointment(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrDoctorScheduleConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": appointment, "message": "Tạo lịch tái khám thành công"})
}

// GetFollowUpAppointments lists follow-up appointments for staff
// @Summary Get follow-up appointments
// @Description Get follow-up appointments filtered by patient, status, or date range. Doctors default to their own schedule.
// @Tags appointments
// @Accept json
// @Produce json
// @Param patientId query string false "Patient ID"
// @Param status query string false "Appointment status (scheduled, completed, canceled)"
// @Param from query string false "Start of date range (RFC3339)"
// @Param to query string false "End of date range (RFC3339)"
// @Success 200 {object} map[string]interface{} "Appointments retrieved successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /appointments [get]
func (h *FollowUpAppointmentHandler) GetFollowUpAppointments(c *gin.Context) {
	input := &usecase.GetFollowUpAppointmentsInput{
		PatientID: c.Query("patientId"),
		Status:    domain.FollowUpAppointmentStatus(c.Query("status")),
	}

	if fromStr := c.Query("from"); fromStr != "" {
		from, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidFromDate})
			return
		}
		input.From = &from
	}
	if toStr := c.Query("to"); toStr != "" {
		to, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidToDate})
			return
		}
		input.To = &to
	}

	if roleVal, roleExists := c.Get("role"); roleExists {
		if role, ok := roleVal.(userDomain.Role); ok {
			userID, userExists := c.Get("userId")
			if userExists {
				switch role {
				case userDomain.RoleDoctor:
					input.DoctorID = userID.(string)
				case userDomain.RoleNurse:
					input.NurseID = userID.(string)
				}
			}
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	appointments, err := h.appointmentService.GetFollowUpAppointments(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": appointments, "message": "Lấy danh sách lịch tái khám thành công"})
}

// GetMyFollowUpAppointments lists follow-up appointments for the authenticated patient or doctor
// @Summary Get my follow-up appointments
// @Description Retrieve follow-up appointments for the authenticated patient or doctor
// @Tags appointments
// @Accept json
// @Produce json
// @Param status query string false "Appointment status (scheduled, completed, canceled)"
// @Param from query string false "Start of date range (RFC3339)"
// @Param to query string false "End of date range (RFC3339)"
// @Success 200 {object} map[string]interface{} "Appointments retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /appointments/me [get]
func (h *FollowUpAppointmentHandler) GetMyFollowUpAppointments(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	input := &usecase.GetFollowUpAppointmentsInput{
		Status: domain.FollowUpAppointmentStatus(c.Query("status")),
	}

	if roleVal, roleExists := c.Get("role"); roleExists {
		if role, ok := roleVal.(userDomain.Role); ok {
			switch role {
			case userDomain.RolePatient:
				input.PatientID = userID.(string)
			case userDomain.RoleDoctor:
				input.DoctorID = userID.(string)
			}
		}
	}

	if fromStr := c.Query("from"); fromStr != "" {
		from, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidFromDate})
			return
		}
		input.From = &from
	}
	if toStr := c.Query("to"); toStr != "" {
		to, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidToDate})
			return
		}
		input.To = &to
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	appointments, err := h.appointmentService.GetFollowUpAppointments(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": appointments, "message": "Lấy danh sách lịch tái khám thành công"})
}

// GetFollowUpAppointmentByID retrieves a follow-up appointment by ID
// @Summary Get follow-up appointment by ID
// @Description Retrieve a follow-up appointment by its ID
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID"
// @Success 200 {object} map[string]interface{} "Appointment retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Not found"
// @Router /appointments/{id} [get]
func (h *FollowUpAppointmentHandler) GetFollowUpAppointmentByID(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	role, _ := c.Get("role")

	input := &usecase.GetFollowUpAppointmentByIDInput{
		ID:     c.Param("id"),
		UserID: userID.(string),
		Role:   role.(userDomain.Role),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	appointment, err := h.appointmentService.GetFollowUpAppointmentByID(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrFollowUpAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAppointmentNotFound})
			return
		}
		if errors.Is(err, service.ErrFollowUpAppointmentAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": constant.MsgAccessDenied})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": appointment, "message": "Lấy lịch tái khám thành công"})
}

// UpdateFollowUpAppointment updates a follow-up appointment
// @Summary Update follow-up appointment
// @Description Reschedule or update notes for a follow-up appointment
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID"
// @Param update body dto.UpdateFollowUpAppointmentRequest true "Update fields"
// @Success 200 {object} map[string]interface{} "Appointment updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 404 {object} map[string]string "Not found"
// @Router /appointments/{id} [patch]
func (h *FollowUpAppointmentHandler) UpdateFollowUpAppointment(c *gin.Context) {
	var req dto.UpdateFollowUpAppointmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateFollowUpAppointmentInput{
		ID:              c.Param("id"),
		ScheduledAt:     req.ScheduledAt,
		DurationMinutes: req.DurationMinutes,
		Timezone:        req.Timezone,
		Location:        req.Location,
		Notes:           req.Notes,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	appointment, err := h.appointmentService.UpdateFollowUpAppointment(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrFollowUpAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAppointmentNotFound})
			return
		}
		if errors.Is(err, service.ErrDoctorScheduleConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": appointment, "message": "Cập nhật lịch tái khám thành công"})
}

// UpdateFollowUpAppointmentStatus updates the status of a follow-up appointment
// @Summary Update follow-up appointment status
// @Description Mark a follow-up appointment as completed or canceled
// @Tags appointments
// @Accept json
// @Produce json
// @Param id path string true "Appointment ID"
// @Param update body dto.UpdateFollowUpAppointmentStatusRequest true "Status update"
// @Success 200 {object} map[string]interface{} "Appointment status updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 404 {object} map[string]string "Not found"
// @Router /appointments/{id}/status [patch]
func (h *FollowUpAppointmentHandler) UpdateFollowUpAppointmentStatus(c *gin.Context) {
	var req dto.UpdateFollowUpAppointmentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateFollowUpAppointmentStatusInput{
		ID:     c.Param("id"),
		Status: req.Status,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	appointment, err := h.appointmentService.UpdateFollowUpAppointmentStatus(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrFollowUpAppointmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": constant.MsgAppointmentNotFound})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": appointment, "message": "Cập nhật trạng thái lịch tái khám thành công"})
}
