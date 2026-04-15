package activity

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/measurement_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type ProcessingAlertActivity struct {
	measurementRepo     repository.MeasurementRepository
	thresholdRepo       repository.ThresholdRepository
	alertRepo           repository.AlertRepository
	notificationService service.NotificationService
}

func NewProcessingAlertActivity(
	measurementRepo repository.MeasurementRepository,
	thresholdRepo repository.ThresholdRepository,
	alertRepo repository.AlertRepository,
	notificationService service.NotificationService,
) *ProcessingAlertActivity {
	return &ProcessingAlertActivity{
		measurementRepo:     measurementRepo,
		thresholdRepo:       thresholdRepo,
		alertRepo:           alertRepo,
		notificationService: notificationService,
	}
}

func (a *ProcessingAlertActivity) EvaluateAndCreateAlertActivity(ctx context.Context, measurementID string, patientID string) (string, error) {
	measurementIDObj, err := util.MustHexToObjectID(measurementID)
	if err != nil {
		return "", fmt.Errorf("invalid measurement ID: %w", err)
	}

	measurement, err := a.measurementRepo.FindByID(ctx, measurementIDObj)
	if err != nil {
		return "", fmt.Errorf("failed to get measurement: %w", err)
	}
	if measurement == nil {
		return "", fmt.Errorf("measurement not found")
	}

	existingAlert, err := a.alertRepo.FindByMeasurementID(ctx, measurement.ID)
	if err != nil {
		return "", fmt.Errorf("failed to check existing alert: %w", err)
	}
	if existingAlert != nil {
		return existingAlert.ID.Hex(), nil
	}

	thresholds, err := a.thresholdRepo.FindWithFilter(ctx, repository.ThresholdFilter{
		PatientID: patientID,
		IsLatest:  true,
	})
	if err != nil {
		return "", fmt.Errorf("failed to get thresholds: %w", err)
	}
	if len(thresholds) == 0 {
		log.Printf("[INFO] no threshold set for patient=%s measurement=%s", patientID, measurementID)
		return "no-threshold", nil
	}

	violations := measurement_helper.EvaluateMeasurementAgainstThreshold(measurement, &thresholds[0])
	if len(violations) == 0 {
		return "no-violation", nil
	}

	now := time.Now().UTC()
	alert, err := a.alertRepo.Create(ctx, &domain.Alert{
		PatientID:      measurement.PatientID,
		MeasurementID:  measurement.ID,
		Violations:     violations,
		Status:         domain.StatusOpen,
		Severity:       measurement_helper.AggregateSeverity(violations),
		AcknowledgedBy: nil,
		AcknowledgedAt: nil,
		CreatedAt:      now,
		UpdatedAt:      now,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create alert: %w", err)
	}
	if alert == nil {
		return "", fmt.Errorf("failed to create alert: empty result")
	}

	log.Printf("[INFO] alert ready for patient=%s measurement=%s alert=%s", patientID, measurementID, alert.ID.Hex())
	return alert.ID.Hex(), nil
}

func (a *ProcessingAlertActivity) SendAlertPushActivity(ctx context.Context, alertID string) error {
	alertObjID, err := util.MustHexToObjectID(alertID)
	if err != nil {
		return fmt.Errorf("invalid alert ID: %w", err)
	}

	alert, _, err := a.alertRepo.FindAlertByID(ctx, alertObjID)
	if err != nil {
		return fmt.Errorf("failed to get alert: %w", err)
	}
	if alert == nil {
		return fmt.Errorf("alert not found")
	}

	violationType := "sức khỏe"
	if len(alert.Violations) > 0 {
		violationType = humanizeViolationType(alert.Violations[0].Type)
	}

	body := fmt.Sprintf("Chỉ số %s vượt ngưỡng an toàn (%s). Vui lòng kiểm tra ngay.", violationType, strings.ToUpper(string(alert.Severity)))
	if alert.Severity == domain.SeverityInfo {
		body = fmt.Sprintf("Có chỉ số %s vượt ngưỡng an toàn. Vui lòng theo dõi thêm.", violationType)
	}

	payload := map[string]string{
		"type":          "alert",
		"alertId":       alert.ID.Hex(),
		"patientId":     alert.PatientID.Hex(),
		"measurementId": alert.MeasurementID.Hex(),
		"severity":      string(alert.Severity),
		"targetScreen":  "PatientAlerts",
	}

	_, err = a.notificationService.PublishToUser(ctx, &usecase.InternalPublishNotificationInput{
		UserID:   alert.PatientID,
		Type:     domain.NotificationTypeAlert,
		Title:    "Cảnh báo sức khỏe",
		Body:     body,
		Data:     payload,
		DedupKey: fmt.Sprintf("alert:%s", alert.ID.Hex()),
	})
	if err != nil {
		return fmt.Errorf("failed to send alert push: %w", err)
	}

	log.Printf("[INFO] alert push sent for alert=%s patient=%s", alert.ID.Hex(), alert.PatientID.Hex())
	return nil
}

func humanizeViolationType(raw string) string {
	switch raw {
	case "temperature":
		return "nhiệt độ"
	case "heart_rate":
		return "nhịp tim"
	case "respiratory_rate":
		return "nhịp thở"
	case "spo2":
		return "SpO2"
	case "blood_pressure_systolic":
		return "huyết áp tâm thu"
	case "blood_pressure_diastolic":
		return "huyết áp tâm trương"
	case "glucose":
		return "đường huyết"
	default:
		return raw
	}
}
