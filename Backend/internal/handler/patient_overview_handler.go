package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/gin-gonic/gin"
)

type PatientOverviewHandler struct {
	service service.PatientOverviewService
}

func NewPatientOverviewHandler(service service.PatientOverviewService) *PatientOverviewHandler {
	return &PatientOverviewHandler{service: service}
}

// GetMyPatientOverview returns an aggregated dashboard for the current nurse/doctor.
// @Summary Get aggregated patient overview for the current nurse/doctor
// @Description Returns, in a single call, the assigned patients together with their
// @Description latest measurement, active threshold and open-alert summary, plus totals.
// @Tags patient-overview
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /patient-overview/me [get]
func (h *PatientOverviewHandler) GetMyPatientOverview(c *gin.Context) {
	userID, exists := c.Get("userId")
	role, existsRole := c.Get("role")
	if !exists || !existsRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	roleVal := role.(domain.Role)
	if roleVal != domain.RoleDoctor && roleVal != domain.RoleNurse {
		c.JSON(http.StatusForbidden, gin.H{"error": constant.MsgOnlyDoctorOrNurse})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	res, err := h.service.GetMyPatientOverview(ctx, userID.(string), roleVal)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}
