package activity

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/measurement_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	idto "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserEventPublisher publishes user-level realtime events to Redis.
type UserEventPublisher interface {
	Publish(ctx context.Context, userID string, event interface{}) error
}

type ProcessingAlertActivity struct {
	measurementRepo     repository.MeasurementRepository
	thresholdRepo       repository.ThresholdRepository
	alertRepo           repository.AlertRepository
	assignmentRepo      repository.AssignmentRepository
	conversationRepo    chatRepository.ConversationRepository
	messageRepo         chatRepository.MessageRepository
	notificationService service.NotificationService
	eventPublisher      measurement_helper.ChatEventPublisher
	userEventPublisher  UserEventPublisher
}

func NewProcessingAlertActivity(
	measurementRepo repository.MeasurementRepository,
	thresholdRepo repository.ThresholdRepository,
	alertRepo repository.AlertRepository,
	assignmentRepo repository.AssignmentRepository,
	conversationRepo chatRepository.ConversationRepository,
	messageRepo chatRepository.MessageRepository,
	notificationService service.NotificationService,
	eventPublisher measurement_helper.ChatEventPublisher,
	userEventPublisher UserEventPublisher,
) *ProcessingAlertActivity {
	return &ProcessingAlertActivity{
		measurementRepo:     measurementRepo,
		thresholdRepo:       thresholdRepo,
		alertRepo:           alertRepo,
		assignmentRepo:      assignmentRepo,
		conversationRepo:    conversationRepo,
		messageRepo:         messageRepo,
		notificationService: notificationService,
		eventPublisher:      eventPublisher,
		userEventPublisher:  userEventPublisher,
	}
}

func (a *ProcessingAlertActivity) EvaluateAndCreateAlertActivity(ctx context.Context, measurementID string, patientID string) (*dto.EvaluateAndCreateAlertResult, error) {
	measurementIDObj, err := util.MustHexToObjectID(measurementID)
	if err != nil {
		return nil, fmt.Errorf("invalid measurement ID: %w", err)
	}

	measurement, err := a.measurementRepo.FindByID(ctx, measurementIDObj)
	if err != nil {
		return nil, fmt.Errorf("failed to get measurement: %w", err)
	}
	if measurement == nil {
		return nil, fmt.Errorf("measurement not found")
	}

	existingAlert, err := a.alertRepo.FindByMeasurementID(ctx, measurement.ID)
	if err != nil {
		return &dto.EvaluateAndCreateAlertResult{Created: false}, fmt.Errorf("failed to check existing alert: %w", err)
	}
	if existingAlert != nil {
		return &dto.EvaluateAndCreateAlertResult{Created: false, AlertID: existingAlert.ID.Hex()}, nil
	}

	thresholds, err := a.thresholdRepo.FindWithFilter(ctx, repository.ThresholdFilter{
		PatientID: patientID,
		IsLatest:  true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get thresholds: %w", err)
	}
	if len(thresholds) == 0 {
		return nil, fmt.Errorf("no threshold set for patient")
	}

	thresholdViolations := measurement_helper.EvaluateMeasurementAgainstThreshold(measurement, &thresholds[0])

	asOf := measurement.CreatedAt
	if asOf.IsZero() {
		asOf = time.Now().UTC()
	}
	since := measurement_helper.TrendHistorySince(asOf)
	history, err := a.measurementRepo.FindWithFilter(ctx, repository.MeasurementFilter{
		PatientID: patientID,
		Since:     &since,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get measurement history for trend: %w", err)
	}

	// One alert per measurement. If a threshold is breached, attach any
	// currently-active trend (edgeOnly=false) so both appear in Violations.
	// If only a trend is active, use edge-trigger (edgeOnly=true) to avoid
	// creating a new alert on every subsequent rising reading.
	edgeOnly := len(thresholdViolations) == 0
	trendViolations := measurement_helper.EvaluateTrends(history, measurement, &thresholds[0], measurement.MealTiming, edgeOnly)

	violations := append(thresholdViolations, trendViolations...)
	if len(violations) == 0 {
		return &dto.EvaluateAndCreateAlertResult{Created: false}, nil
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
		return nil, fmt.Errorf("failed to create alert: %w", err)
	}
	if alert == nil || alert.ID.IsZero() {
		return nil, fmt.Errorf("failed to create alert: missing alert id")
	}

	// Print for local debugging
	fmt.Printf("Alert created for patient %s: %+v\n", patientID, alert)
	return &dto.EvaluateAndCreateAlertResult{Created: true, AlertID: alert.ID.Hex()}, nil
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

	body := buildAlertMessageContent(alert)

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
		// Best-effort: push notification is non-critical, log and continue
		log.Printf("[WARN] failed to send alert push (non-fatal) for alert=%s: %v", alertID, err)
		return nil
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

func isTrendRule(rule string) bool {
	switch rule {
	case "trend_rising_watch", "trend_rising_high", "trend_falling_watch", "trend_falling_high":
		return true
	default:
		return false
	}
}

func hasThresholdViolation(alert *domain.Alert) bool {
	if alert == nil {
		return false
	}
	for _, v := range alert.Violations {
		if !isTrendRule(v.Rule) {
			return true
		}
	}
	return false
}

func hasTrendHigh(alert *domain.Alert) bool {
	return alertHasRule(alert, "trend_rising_high") || alertHasRule(alert, "trend_falling_high")
}

func hasTrendWatch(alert *domain.Alert) bool {
	return alertHasRule(alert, "trend_rising_watch") ||
		alertHasRule(alert, "trend_falling_watch") ||
		hasTrendHigh(alert)
}

func alertHasRule(alert *domain.Alert, rule string) bool {
	if alert == nil {
		return false
	}
	for _, v := range alert.Violations {
		if v.Rule == rule {
			return true
		}
	}
	return false
}

func firstThresholdViolationType(alert *domain.Alert) string {
	if alert == nil {
		return ""
	}
	for _, v := range alert.Violations {
		if !isTrendRule(v.Rule) {
			return v.Type
		}
	}
	return ""
}

func firstTrendViolationType(alert *domain.Alert) string {
	if alert == nil {
		return ""
	}
	for _, v := range alert.Violations {
		if isTrendRule(v.Rule) {
			return v.Type
		}
	}
	return ""
}

func trendLevelPhrase(alert *domain.Alert) string {
	if hasTrendHigh(alert) {
		if alertHasRule(alert, "trend_falling_high") && !alertHasRule(alert, "trend_rising_high") {
			return "cảnh báo xu hướng giảm đường huyết - mức cao, khuyến nghị liên hệ bác sĩ"
		}
		return "cảnh báo xu hướng - mức cao, khuyến nghị liên hệ bác sĩ"
	}
	if alertHasRule(alert, "trend_falling_watch") && !alertHasRule(alert, "trend_rising_watch") {
		return "cảnh báo xu hướng giảm đường huyết - mức theo dõi"
	}
	return "cảnh báo xu hướng - mức theo dõi"
}

// buildAlertMessageContent covers threshold-only, trend-only, and merged alerts.
func buildAlertMessageContent(alert *domain.Alert) string {
	thresholdHit := hasThresholdViolation(alert)
	trendHit := hasTrendWatch(alert)

	thresholdType := humanizeViolationType(firstThresholdViolationType(alert))
	if thresholdType == "" {
		thresholdType = "sức khỏe"
	}
	trendType := humanizeViolationType(firstTrendViolationType(alert))
	if trendType == "" {
		trendType = "sức khỏe"
	}

	switch {
	case thresholdHit && trendHit:
		return fmt.Sprintf(
			"Chỉ số %s vượt ngưỡng; đồng thời %s (%s).",
			thresholdType,
			trendLevelPhrase(alert),
			trendType,
		)
	case trendHit:
		// Capitalize first letter for a standalone sentence.
		phrase := trendLevelPhrase(alert)
		return fmt.Sprintf("%s%s (%s).", strings.ToUpper(phrase[:1]), phrase[1:], trendType)
	case alert != nil && alert.Severity == domain.SeverityInfo:
		return fmt.Sprintf("Có chỉ số %s vượt ngưỡng cá nhân. Vui lòng theo dõi thêm.", thresholdType)
	default:
		return fmt.Sprintf("Chỉ số %s vượt ngưỡng an toàn nghiêm trọng. Vui lòng kiểm tra ngay.", thresholdType)
	}
}

func (a *ProcessingAlertActivity) SendAlertMessageActivity(ctx context.Context, input dto.SendAlertMessageInput) (*dto.SendAlertMessageResult, error) {
	alertID, err := util.MustHexToObjectID(input.AlertID)
	if err != nil {
		return nil, fmt.Errorf("invalid alert ID: %w", err)
	}

	alert, _, err := a.alertRepo.FindAlertByID(ctx, alertID)
	if err != nil {
		return nil, fmt.Errorf("failed to load alert: %w", err)
	}
	if alert == nil {
		return nil, fmt.Errorf("alert not found")
	}

	assignment, err := a.assignmentRepo.FindByPatientID(ctx, alert.PatientID)
	if err != nil {
		return nil, fmt.Errorf("failed to find assignment for patient %s: %w", alert.PatientID.Hex(), err)
	}

	participantIDs := []primitive.ObjectID{alert.PatientID, assignment.DoctorID}
	conversation, err := a.conversationRepo.FindByParticipants(ctx, participantIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to find conversation: %w", err)
	}
	if conversation == nil {
		conversation = &chatDomain.Conversation{
			Participants: buildParticipants(participantIDs),
		}
		conversation, err = a.conversationRepo.Create(ctx, conversation)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get/create conversation: %w", err)
	}

	messageContent := buildAlertMessageContent(alert)
	message := &chatDomain.Message{
		ConversationID: conversation.ID,
		MessageSource:  chatDomain.SystemMessage,
		SenderID:       nil,
		Content:        messageContent,
		RelatedAlertID: &alert.ID,
	}
	createdMessage, err := a.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, fmt.Errorf("failed to send system message: %w", err)
	}

	return &dto.SendAlertMessageResult{
		ConversationID: conversation.ID.Hex(),
		Message:        mapMessageToDTO(createdMessage),
		DoctorID:       assignment.DoctorID.Hex(),
		PatientID:      alert.PatientID.Hex(),
		AlertID:        alert.ID.Hex(),
		Severity:       string(alert.Severity),
	}, nil
}

func (a *ProcessingAlertActivity) PublishChatEventActivity(ctx context.Context, input dto.PublishChatEventInput) error {
	if a.eventPublisher == nil {
		return nil
	}

	conversationID, err := util.MustHexToObjectID(input.ConversationID)
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}

	payload, err := json.Marshal(map[string]interface{}{
		"type": "NEW_MESSAGE",
		"data": input.Message,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal alert chat event: %w", err)
	}

	if err := a.eventPublisher.PublishChatEvent(ctx, conversationID, payload); err != nil {
		return fmt.Errorf("failed to publish alert chat event: %w", err)
	}

	return nil
}

// PublishUserEventActivity publishes a user-level realtime notification for a system alert message
// to the assigned doctor, so they receive an in-app notification.
func (a *ProcessingAlertActivity) PublishUserEventActivity(ctx context.Context, input dto.PublishUserEventInput) error {
	if a.userEventPublisher == nil {
		return nil
	}

	if input.DoctorID == "" || input.Message == nil {
		log.Printf("warn: skipping PublishUserEventActivity — missing doctorID or message")
		return nil
	}

	var patientID *string
	if input.PatientID != "" {
		patientID = &input.PatientID
	}
	var alertID *string
	if input.AlertID != "" {
		alertID = &input.AlertID
	}
	var severity *string
	if input.Severity != "" {
		severity = &input.Severity
	}

	event := map[string]interface{}{
		"type":      "chat.alert_message",
		"eventId":   fmt.Sprintf("chat:alert_message:%s:recipient:%s", input.Message.ID.Hex(), input.DoctorID),
		"createdAt": input.Message.CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
		"data": map[string]interface{}{
			"conversationId": input.ConversationID,
			"messageId":      input.Message.ID.Hex(),
			"senderId":       nil,
			"messageSource":  "system",
			"patientId":      patientID,
			"relatedAlertId": alertID,
			"severity":       severity,
			"preview":        "Có cảnh báo sức khỏe mới cần kiểm tra.",
			"message":        input.Message,
		},
	}

	if err := a.userEventPublisher.Publish(ctx, input.DoctorID, event); err != nil {
		log.Printf("warn: failed to publish user event for doctor=%s: %v", input.DoctorID, err)
		// Don't fail the activity on publish error
		return nil
	}

	log.Printf("[INFO] published user event for alert message to doctor=%s", input.DoctorID)
	return nil
}

func buildParticipants(ids []primitive.ObjectID) []chatDomain.Participant {
	participants := make([]chatDomain.Participant, 0, len(ids))
	for _, id := range ids {
		participants = append(participants, chatDomain.Participant{UserID: id})
	}

	return participants
}

func mapMessageToDTO(m *chatDomain.Message) *idto.MessageResponse {
	if m == nil {
		return nil
	}

	return &idto.MessageResponse{
		ID:               m.ID,
		ConversationID:   m.ConversationID,
		MessageSource:    m.MessageSource,
		SenderID:         m.SenderID,
		Content:          m.Content,
		ReplyToMessageID: m.ReplyToMessageID,
		RelatedAlertID:   m.RelatedAlertID,
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.CreatedAt,
	}
}
