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
