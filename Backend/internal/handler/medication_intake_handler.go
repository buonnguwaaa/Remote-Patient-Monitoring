package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type MedicationIntakeHandler struct {
	medicationIntakeService service.MedicationIntakeService
}

func NewMedicationIntakeHandler(medicationIntakeService service.MedicationIntakeService) *MedicationIntakeHandler {
	return &MedicationIntakeHandler{
		medicationIntakeService: medicationIntakeService,
	}
}

// CreateMedicationIntake records that the patient took a medication dose
// @Summary Mark medication as taken
// @Description Record a medication intake for today's scheduled dose
// @Tags medication-intakes
// @Accept json
// @Produce json
// @Param intake body dto.CreateMedicationIntakeRequest true "Intake details"
// @Success 201 {object} map[string]interface{} "Medication intake recorded"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /medication-intakes [post]
func (h *MedicationIntakeHandler) CreateMedicationIntake(c *gin.Context) {
	var req dto.CreateMedicationIntakeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	input := &usecase.CreateMedicationIntakeInput{
		PatientID:      userID.(string),
		PrescriptionID: req.PrescriptionID,
		DrugName:       req.DrugName,
		Dose: domain.MedicationDose{
			TimeOfDay:  req.Dose.TimeOfDay,
			Hour:       req.Dose.Hour,
			Minute:     req.Dose.Minute,
			MealTiming: req.Dose.MealTiming,
			PillCount:  req.Dose.PillCount,
		},
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	intake, err := h.medicationIntakeService.CreateMedicationIntake(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": intake, "message": "Đã ghi nhận uống thuốc"})
}

// GetTodayMedications returns today's medication checklist for the authenticated patient
// @Summary Get today's medications
// @Description Get today's medication checklist with taken/expected counts per drug
// @Tags prescriptions
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Today's medications retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /prescriptions/me/today [get]
func (h *MedicationIntakeHandler) GetTodayMedications(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	medications, err := h.medicationIntakeService.GetTodayMedications(ctx, &usecase.GetTodayMedicationsInput{
		PatientID: userID.(string),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": medications, "message": "Lấy danh sách thuốc hôm nay thành công"})
}

// GetMedicationAdherence returns expected vs taken doses aggregated over a date range
// @Summary Get medication adherence
// @Description Compare prescription schedule against intake log to show taken, missed, and pending doses
// @Tags medication-intakes
// @Accept json
// @Produce json
// @Param days query int false "Number of days including today (default 7, max 90)"
// @Param from query string false "Start date (YYYY-MM-DD)"
// @Param to query string false "End date (YYYY-MM-DD)"
// @Param patientId query string false "Patient ID (staff only)"
// @Success 200 {object} map[string]interface{} "Adherence retrieved successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Router /medication-intakes/adherence [get]
func (h *MedicationIntakeHandler) GetMedicationAdherence(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	patientID := c.Query("patientId")
	if patientID == "" {
		patientID = userID.(string)
	}

	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))

	input := &usecase.GetMedicationAdherenceInput{
		PatientID: patientID,
		Days:      days,
	}

	if fromStr := c.Query("from"); fromStr != "" {
		from, err := time.Parse("2006-01-02", fromStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidFromDate})
			return
		}
		input.From = &from
	}
	if toStr := c.Query("to"); toStr != "" {
		to, err := time.Parse("2006-01-02", toStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidToDate})
			return
		}
		input.To = &to
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	adherence, err := h.medicationIntakeService.GetMedicationAdherence(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": adherence, "message": "Lấy dữ liệu tuân thủ uống thuốc thành công"})
}
