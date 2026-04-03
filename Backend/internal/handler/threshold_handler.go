package handler

import (
	"net/http"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type ThresholdHandler struct {
	service service.ThresholdService
}

func NewThresholdHandler(s service.ThresholdService) *ThresholdHandler {
	return &ThresholdHandler{
		service: s,
	}
}

// CreateThreshold handles the creation of a new threshold for a patient
// @Summary Create a new threshold
// @Description Create a new threshold record for a patient
// @Tags thresholds
// @Accept json
// @Produce json
// @Param threshold body dto.CreateThresholdRequest true "Threshold data"
// @Success 200 {object} map[string]interface{} "Threshold created successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /thresholds [post]
func (h *ThresholdHandler) CreateThreshold(c *gin.Context) {
	var req dto.CreateThresholdRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if userID, exists := c.Get("userId"); exists {
		req.DoctorID = userID.(string)
	}

	input := &usecase.CreateThresholdInput{
		PatientID:          req.PatientID,
		DoctorID:           req.DoctorID,
		TemperatureMin:     req.TemperatureMin,
		TemperatureMax:     req.TemperatureMax,
		HeartRateMin:       req.HeartRateMin,
		HeartRateMax:       req.HeartRateMax,
		RespiratoryRateMin: req.RespiratoryRateMin,
		RespiratoryRateMax: req.RespiratoryRateMax,
		SpO2Min:            req.SpO2Min,
		SysMin:             req.SysMin,
		SysMax:             req.SysMax,
		DiaMin:             req.DiaMin,
		DiaMax:             req.DiaMax,
		GlucoseMin:         req.GlucoseMin,
		GlucoseMax:         req.GlucoseMax,
		EffectiveFrom:      req.EffectiveFrom,
		EffectiveTo:        req.EffectiveTo,
	}

	resp, err := h.service.CreateThreshold(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Threshold created successfully"})
}

// GetThresholds handles retrieving thresholds based on query parameters
// @Summary Get thresholds
// @Description Retrieve thresholds for a patient or doctor
// @Tags thresholds
// @Accept json
// @Produce json
// @Param patientId query string false "Patient ID"
// @Param doctorId query string false "Doctor ID"
// @Param latest query boolean false "Get latest threshold only"
// @Success 200 {object} map[string]interface{} "Thresholds retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /thresholds [get]
func (h *ThresholdHandler) GetThresholds(c *gin.Context) {
	doctorID := c.Query("doctorId")
	if doctorID == "" {
		if currentUserID, exists := c.Get("userId"); exists {
			doctorID = currentUserID.(string)
		}
	}

	input := &usecase.GetThresholdsInput{
		PatientID: c.Query("patientId"),
		DoctorID:  doctorID,
		IsLatest:  c.Query("latest") == "true",
	}

	resp, err := h.service.GetThresholds(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Thresholds retrieved successfully"})
}

// UpdateThreshold handles updating an existing threshold
// @Summary Update a threshold
// @Description Update an existing threshold record
// @Tags thresholds
// @Accept json
// @Produce json
// @Param id path string true "Threshold ID"
// @Param threshold body dto.UpdateThresholdRequest true "Updated threshold data"
// @Success 200 {object} map[string]interface{} "Threshold updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /thresholds/{id} [patch]
func (h *ThresholdHandler) UpdateThreshold(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateThresholdRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateThresholdInput{
		ID:                 id,
		TemperatureMin:     req.TemperatureMin,
		TemperatureMax:     req.TemperatureMax,
		HeartRateMin:       req.HeartRateMin,
		HeartRateMax:       req.HeartRateMax,
		RespiratoryRateMin: req.RespiratoryRateMin,
		RespiratoryRateMax: req.RespiratoryRateMax,
		SpO2Min:            req.SpO2Min,
		SysMin:             req.SysMin,
		SysMax:             req.SysMax,
		DiaMin:             req.DiaMin,
		DiaMax:             req.DiaMax,
		GlucoseMin:         req.GlucoseMin,
		GlucoseMax:         req.GlucoseMax,
		EffectiveFrom:      req.EffectiveFrom,
		EffectiveTo:        req.EffectiveTo,
	}

	resp, err := h.service.UpdateThreshold(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Threshold updated successfully"})
}

// DeleteThreshold handles deleting a historical threshold
// @Summary Delete a threshold
// @Description Delete an existing historical threshold record
// @Tags thresholds
// @Accept json
// @Produce json
// @Param id path string true "Threshold ID"
// @Success 200 {object} map[string]interface{} "Threshold deleted successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /thresholds/{id} [delete]
func (h *ThresholdHandler) DeleteThreshold(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing threshold id"})
		return
	}

	doctorID := ""
	if userID, exists := c.Get("userId"); exists {
		doctorID = userID.(string)
	}

	input := &usecase.DeleteThresholdInput{
		ID:       id,
		DoctorID: doctorID,
	}

	if err := h.service.DeleteThreshold(c.Request.Context(), input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Threshold deleted successfully"})
}
