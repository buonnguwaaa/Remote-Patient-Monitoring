package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type MeasurementHandler struct {
	service service.MeasurementService
}

func NewMeasurementHandler(s service.MeasurementService) *MeasurementHandler {
	return &MeasurementHandler{
		service: s,
	}
}

// CreateMeasurement handles the creation of a new measurement for a patient
// @Summary Create a new measurement
// @Description Create a new measurement record for a patient
// @Tags measurements
// @Accept json
// @Produce json
// @Param measurement body dto.CreateMeasurementRequest true "Measurement data"
// @Success 200 {object} map[string]interface{} "Measurement created successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /measurements [post]
func (h *MeasurementHandler) CreateMeasurement(c *gin.Context) {
	var req dto.CreateMeasurementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.CreateMeasurementInput{
		PatientID:       req.PatientID,
		Temperature:     req.Temperature,
		HeartRate:       req.HeartRate,
		RespiratoryRate: req.RespiratoryRate,
		SpO2:            req.SpO2,
		BloodPressure:   req.BloodPressure,
		Height:          req.Height,
		Weight:          req.Weight,
		Glucose:         req.Glucose,
		MealTiming:      req.MealTiming,
		Device:          req.Device,
		Note:            req.Note,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.service.CreateMeasurement(ctx, input)
	if err != nil {
		var validationErr *service.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"field": validationErr.Field, "error": validationErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Measurement added successfully"})
}

// UpdateMeasurement handles updating an existing measurement
// @Summary Update an existing measurement
// @Description Update an existing measurement record
// @Tags measurements
// @Accept json
// @Produce json
// @Param id path string true "Measurement ID"
// @Param measurement body dto.UpdateMeasurementRequest true "Updated measurement data"
// @Success 200 {object} map[string]interface{} "Measurement updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /measurements/{id} [patch]
func (h *MeasurementHandler) UpdateMeasurement(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateMeasurementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateMeasurementInput{
		ID:              id,
		Temperature:     req.Temperature,
		HeartRate:       req.HeartRate,
		RespiratoryRate: req.RespiratoryRate,
		SpO2:            req.SpO2,
		BloodPressure:   req.BloodPressure,
		Height:          req.Height,
		Weight:          req.Weight,
		Glucose:         req.Glucose,
		MealTiming:      req.MealTiming,
		Device:          req.Device,
		Note:            req.Note,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.service.UpdateMeasurement(ctx, input)
	if err != nil {
		var validationErr *service.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"field": validationErr.Field, "error": validationErr.Message})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Measurement updated successfully"})
}

// GetMeasurements retrieves measurements based on query parameters
// @Summary Get measurements
// @Description Retrieve measurements based on query parameters
// @Description If `patientId` is provided along with `latest=true`, only the latest measurement record for that patient will be returned.
// @Description   Ví dụ: `/measurements?patientId=123&latest=true`
// @Tags measurements
// @Accept json
// @Produce json
// @Param patientId query string false "Patient ID"
// @Param mealTiming query string false "Meal timing (pre_meal, post_meal)"
// @Param latest query boolean false "Get latest measurement only"
// @Success 200 {object} map[string]interface{} "Measurements retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /measurements [get]
func (h *MeasurementHandler) GetMeasurements(c *gin.Context) {
	input := &usecase.GetMeasurementsInput{
		PatientID:  c.Query("patientId"),
		MealTiming: c.Query("mealTiming"),
		IsLatest:   c.Query("latest") == "true",
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.service.GetMeasurements(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Measurements retrieved successfully"})
}
