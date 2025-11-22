package handler

import (
	"context"
	"time"
	"net/http"

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

// func (h *MeasurementHandler) UpdateMeasurement(c *gin.Context) {
// 	id := c.Param("id")
// 	var req dto.UpdateMeasurementRequest
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(400, gin.H{"error": err.Error()})
// 		return
// 	}
// 	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
// 	defer cancel()

// 	input := &usecase.UpdateMeasurementInput{}
// }
