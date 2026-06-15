package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type PrescriptionHandler struct {
	prescriptionService service.PrescriptionService
}

func NewPrescriptionHandler(prescriptionService service.PrescriptionService) *PrescriptionHandler {
	return &PrescriptionHandler{
		prescriptionService: prescriptionService,
	}
}

// CreatePrescription creates a new prescription for a patient
// @Summary Create a prescription
// @Description Create a new prescription for a patient (doctor only)
// @Tags prescriptions
// @Accept json
// @Produce json
// @Param prescription body dto.CreatePrescriptionRequest true "Prescription details"
// @Success 201 {object} map[string]interface{} "Prescription created successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Router /prescriptions [post]
func (h *PrescriptionHandler) CreatePrescription(c *gin.Context) {
	var req dto.CreatePrescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	input := &usecase.CreatePrescriptionInput{
		PatientID:    req.PatientID,
		Medications:  medicationsFromDTO(req.Medications),
		Timezone:     req.Timezone,
		DaysOfWeek:   req.DaysOfWeek,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		PrescribedBy: userID.(string),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	prescription, err := h.prescriptionService.CreatePrescription(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": prescription, "message": "Prescription created successfully"})
}

// GetPrescriptions retrieves prescriptions based on filters
// @Summary Get prescriptions
// @Description Get prescriptions filtered by patient, status, assigned doctor/nurse, or prescriber. Doctors and nurses default to their own assigned patients when doctorId/nurseId is omitted.
// @Tags prescriptions
// @Accept json
// @Produce json
// @Param patientId query string false "Patient ID"
// @Param status query string false "Prescription status (active, completed, discontinued, expired)"
// @Param latest query bool false "Return only the latest prescription"
// @Param doctorId query string false "Filter prescriptions for patients assigned to this doctor"
// @Param nurseId query string false "Filter prescriptions for patients assigned to this nurse"
// @Param prescribedBy query string false "Filter prescriptions written by this doctor"
// @Success 200 {object} map[string]interface{} "Prescriptions retrieved successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /prescriptions [get]
func (h *PrescriptionHandler) GetPrescriptions(c *gin.Context) {
	input := &usecase.GetPrescriptionsInput{
		PatientID:    c.Query("patientId"),
		Status:       domain.PrescriptionStatus(c.Query("status")),
		IsLatest:     c.Query("latest") == "true",
		DoctorID:     c.Query("doctorId"),
		NurseID:      c.Query("nurseId"),
		PrescribedBy: c.Query("prescribedBy"),
	}

	if roleVal, roleExists := c.Get("role"); roleExists {
		if role, ok := roleVal.(userDomain.Role); ok {
			userID, userExists := c.Get("userId")
			if userExists {
				switch role {
				case userDomain.RoleDoctor:
					if input.DoctorID == "" {
						input.DoctorID = userID.(string)
					}
				case userDomain.RoleNurse:
					if input.NurseID == "" {
						input.NurseID = userID.(string)
					}
				}
			}
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	prescriptions, err := h.prescriptionService.GetPrescriptions(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prescriptions, "message": "Prescriptions retrieved successfully"})
}

// GetMyPrescriptions retrieves prescriptions for the authenticated patient
// @Summary Get my prescriptions
// @Description Retrieve all prescriptions for the authenticated patient
// @Tags prescriptions
// @Accept json
// @Produce json
// @Param status query string false "Prescription status (active, completed, discontinued, expired)"
// @Param latest query bool false "Return only the latest prescription"
// @Success 200 {object} map[string]interface{} "Prescriptions retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Router /prescriptions/me [get]
func (h *PrescriptionHandler) GetMyPrescriptions(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	input := &usecase.GetPrescriptionsInput{
		PatientID: userID.(string),
		Status:    domain.PrescriptionStatus(c.Query("status")),
		IsLatest:  c.Query("latest") == "true",
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	prescriptions, err := h.prescriptionService.GetPrescriptions(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prescriptions, "message": "Prescriptions retrieved successfully"})
}

// GetPrescriptionByID retrieves a single prescription by ID
// @Summary Get prescription by ID
// @Description Retrieve a prescription by its ID
// @Tags prescriptions
// @Accept json
// @Produce json
// @Param id path string true "Prescription ID"
// @Success 200 {object} map[string]interface{} "Prescription retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Not found"
// @Router /prescriptions/{id} [get]
func (h *PrescriptionHandler) GetPrescriptionByID(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	role, _ := c.Get("role")

	input := &usecase.GetPrescriptionByIDInput{
		ID:     c.Param("id"),
		UserID: userID.(string),
		Role:   role.(userDomain.Role),
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	prescription, err := h.prescriptionService.GetPrescriptionByID(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrPrescriptionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "prescription not found"})
			return
		}
		if errors.Is(err, service.ErrPrescriptionAccessDenied) {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prescription, "message": "Prescription retrieved successfully"})
}

// UpdatePrescriptionByID updates a prescription
// @Summary Update prescription
// @Description Update prescription details (doctor only)
// @Tags prescriptions
// @Accept json
// @Produce json
// @Param id path string true "Prescription ID"
// @Param update body dto.UpdatePrescriptionRequest true "Update fields"
// @Success 200 {object} map[string]interface{} "Prescription updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Not found"
// @Router /prescriptions/{id} [patch]
func (h *PrescriptionHandler) UpdatePrescriptionByID(c *gin.Context) {
	var req dto.UpdatePrescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdatePrescriptionInput{
		ID:          c.Param("id"),
		Medications: medicationsFromDTO(req.Medications),
		Timezone:    req.Timezone,
		DaysOfWeek:  req.DaysOfWeek,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		Status:      req.Status,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	prescription, err := h.prescriptionService.UpdatePrescriptionByID(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrPrescriptionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "prescription not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prescription, "message": "Prescription updated successfully"})
}

// UpdatePrescriptionStatus updates only the status of a prescription
// @Summary Update prescription status
// @Description Update only the status of a prescription (doctor only)
// @Tags prescriptions
// @Accept json
// @Produce json
// @Param id path string true "Prescription ID"
// @Param update body dto.UpdatePrescriptionStatusRequest true "Status update"
// @Success 200 {object} map[string]interface{} "Prescription status updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Not found"
// @Router /prescriptions/{id}/status [patch]
func (h *PrescriptionHandler) UpdatePrescriptionStatus(c *gin.Context) {
	var req dto.UpdatePrescriptionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdatePrescriptionStatusInput{
		ID:     c.Param("id"),
		Status: req.Status,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	prescription, err := h.prescriptionService.UpdatePrescriptionStatus(ctx, input)
	if err != nil {
		if errors.Is(err, service.ErrPrescriptionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "prescription not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": prescription, "message": "Prescription status updated successfully"})
}

func medicationsFromDTO(meds []dto.PrescriptionMedicationRequest) []domain.PrescriptionMedication {
	result := make([]domain.PrescriptionMedication, len(meds))
	for i, med := range meds {
		schedule := make([]domain.MedicationDose, len(med.Schedule))
		for j, dose := range med.Schedule {
			schedule[j] = domain.MedicationDose{
				TimeOfDay:  dose.TimeOfDay,
				Hour:       dose.Hour,
				Minute:     dose.Minute,
				MealTiming: dose.MealTiming,
				PillCount:  dose.PillCount,
			}
		}
		result[i] = domain.PrescriptionMedication{
			DrugName:     med.DrugName,
			Dosage:       med.Dosage,
			Route:        med.Route,
			Instructions: med.Instructions,
			Schedule:     schedule,
		}
	}
	return result
}
