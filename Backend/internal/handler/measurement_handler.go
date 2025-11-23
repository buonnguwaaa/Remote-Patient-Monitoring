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
		PatientID: req.PatientID,
		Type:      req.Type,
		Systolic:  req.Systolic,
		Diastolic: req.Diastolic,
		Pulse:     req.Pulse,
		Glucose:   req.Glucose,
		Timing:    req.Timing,
		Unit:      req.Unit,
		Device:    req.Device,
		Note:      req.Note,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := h.service.CreateMeasurement(ctx, input)
	if err != nil {
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateMeasurementInput{
		ID:        id,
		Type:      req.Type,
		Systolic:  req.Systolic,
		Diastolic: req.Diastolic,
		Pulse:     req.Pulse,
		Glucose:   req.Glucose,
		Timing:    req.Timing,
		Unit:      req.Unit,
		Device:    req.Device,
		Note:      req.Note,
	}

	resp, err := h.service.UpdateMeasurement(ctx, input)
	if err != nil {
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
// @Param type query string false "Measurement type"
// @Param timing query string false "Measurement timing"
// @Param latest query boolean false "Get latest measurement only"
// @Success 200 {object} map[string]interface{} "Measurements retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /measurements [get]
func (h *MeasurementHandler) GetMeasurements(c *gin.Context) {
	input := &usecase.GetMeasurementsInput{
		PatientID: c.Query("patientId"),
		Type:      c.Query("type"),
		Timing:    c.Query("timing"),
		IsLatest:  c.Query("latest") == "true",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := h.service.GetMeasurements(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp, "message": "Measurements retrieved successfully"})
}
