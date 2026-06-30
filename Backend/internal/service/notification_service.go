package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var ErrInvalidPushToken = errors.New("Token push không hợp lệ")

type PushProvider interface {
	Send(ctx context.Context, token string, title string, body string, data map[string]string) error
}

type NotificationService interface {
	RegisterToken(ctx context.Context, input *usecase.RegisterNotificationTokenInput) (*dto.NotificationTokenResponse, error)
	DeactivateToken(ctx context.Context, input *usecase.DeactivateNotificationTokenInput) error
	SendToUser(ctx context.Context, userID primitive.ObjectID, title string, body string, data map[string]string) error
	PublishToUser(ctx context.Context, input *usecase.InternalPublishNotificationInput) (*dto.NotificationResponse, error)
	ListUserNotifications(ctx context.Context, userID string, input *usecase.ListNotificationsInput) ([]dto.NotificationResponse, error)
	MarkNotificationRead(ctx context.Context, input *usecase.MarkNotificationReadInput) (*dto.NotificationResponse, error)
	CountUnread(ctx context.Context, userID string) (int64, error)
}

type notificationService struct {
	notificationTokenRepo repository.NotificationTokenRepository
	notificationRepo      repository.UserNotificationRepository
	pushProvider          PushProvider
}

func NewNotificationService(notificationTokenRepo repository.NotificationTokenRepository, notificationRepo repository.UserNotificationRepository, pushProvider PushProvider) NotificationService {
	return &notificationService{
		notificationTokenRepo: notificationTokenRepo,
		notificationRepo:      notificationRepo,
		pushProvider:          pushProvider,
	}
}

func (s *notificationService) RegisterToken(ctx context.Context, input *usecase.RegisterNotificationTokenInput) (*dto.NotificationTokenResponse, error) {
	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}

	deviceID := strings.TrimSpace(input.DeviceID)
	platform := strings.ToLower(strings.TrimSpace(input.Platform))
	provider := strings.ToLower(strings.TrimSpace(input.Provider))
	tokenValue := strings.TrimSpace(input.Token)

	if deviceID == "" {
		return nil, fmt.Errorf("deviceId là bắt buộc")
	}
	if tokenValue == "" {
		return nil, fmt.Errorf("Token là bắt buộc")
	}
	if platform != "android" {
		return nil, fmt.Errorf("Nền tảng không được hỗ trợ: %s", input.Platform)
	}
	if provider != "fcm" {
		return nil, fmt.Errorf("Nhà cung cấp không được hỗ trợ: %s", input.Provider)
	}

	now := time.Now().UTC()
	registered, err := s.notificationTokenRepo.UpsertByUserAndDevice(ctx, &domain.NotificationToken{
		UserID:     userID,
		DeviceID:   deviceID,
		Platform:   platform,
		Provider:   provider,
		Token:      tokenValue,
		IsActive:   true,
		LastSeenAt: now,
		CreatedAt:  now,
		UpdatedAt:  now,
	})
	if err != nil {
		return nil, err
	}

	return mapNotificationTokenResponse(registered), nil
}

func (s *notificationService) DeactivateToken(ctx context.Context, input *usecase.DeactivateNotificationTokenInput) error {
	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return err
	}

	deviceID := strings.TrimSpace(input.DeviceID)
	if deviceID == "" {
		return fmt.Errorf("deviceId là bắt buộc")
	}

	return s.notificationTokenRepo.DeactivateByUserAndDevice(ctx, userID, deviceID)
}

func (s *notificationService) SendToUser(ctx context.Context, userID primitive.ObjectID, title string, body string, data map[string]string) error {
	_, _, err := s.dispatchToUser(ctx, userID, title, body, data)
	return err
}

func (s *notificationService) PublishToUser(ctx context.Context, input *usecase.InternalPublishNotificationInput) (*dto.NotificationResponse, error) {
	if input == nil {
		return nil, fmt.Errorf("Dữ liệu thông báo là bắt buộc")
	}
	if input.UserID.IsZero() {
		return nil, fmt.Errorf("userId thông báo là bắt buộc")
	}
	if strings.TrimSpace(input.Title) == "" {
		return nil, fmt.Errorf("Tiêu đề thông báo là bắt buộc")
	}
	if strings.TrimSpace(input.Body) == "" {
		return nil, fmt.Errorf("Nội dung thông báo là bắt buộc")
	}

	typeValue := input.Type
	if typeValue == "" {
		typeValue = domain.NotificationTypeReminder
	}

	dedupKey := strings.TrimSpace(input.DedupKey)
	if dedupKey == "" {
		dedupKey = fmt.Sprintf("%s:%s:%d", typeValue, input.UserID.Hex(), time.Now().UTC().UnixNano())
	}

	baseData := cloneStringMap(input.Data)
	draft := &domain.UserNotification{
		UserID:         input.UserID,
		Type:           typeValue,
		Title:          strings.TrimSpace(input.Title),
		Body:           strings.TrimSpace(input.Body),
		Data:           baseData,
		DedupKey:       dedupKey,
		DeliveryStatus: domain.NotificationDeliveryPending,
	}

	notification, created, err := s.notificationRepo.CreateOrGetByDedupKey(ctx, draft)
	if err != nil {
		return nil, err
	}
	if notification == nil {
		return nil, fmt.Errorf("Không thể tạo lịch sử thông báo")
	}

	if !created && (notification.DeliveryStatus == domain.NotificationDeliverySent || notification.DeliveryStatus == domain.NotificationDeliverySkipped) {
		return mapNotificationResponse(notification), nil
	}

	sendData := cloneStringMap(notification.Data)
	if sendData == nil {
		sendData = map[string]string{}
	}
	sendData["notificationId"] = notification.ID.Hex()
	sendData["type"] = string(notification.Type)

	status, deliveryError, sendErr := s.dispatchToUser(ctx, notification.UserID, notification.Title, notification.Body, sendData)

	var deliveredAt *time.Time
	if status == domain.NotificationDeliverySent {
		now := time.Now().UTC()
		deliveredAt = &now
	}

	updated, err := s.notificationRepo.UpdateDelivery(ctx, notification.ID, status, deliveredAt, deliveryError)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		updated = notification
	}

	if sendErr != nil {
		return mapNotificationResponse(updated), sendErr
	}
	return mapNotificationResponse(updated), nil
}

func (s *notificationService) ListUserNotifications(ctx context.Context, userID string, input *usecase.ListNotificationsInput) ([]dto.NotificationResponse, error) {
	userObjID, err := util.MustHexToObjectID(userID)
	if err != nil {
		return nil, err
	}

	filter := repository.UserNotificationFilter{}
	if input != nil {
		filter.UnreadOnly = input.UnreadOnly
		filter.Limit = input.Limit
		filter.Offset = input.Offset
	}

	notifications, err := s.notificationRepo.FindByUserID(ctx, userObjID, filter)
	if err != nil {
		return nil, err
	}

	responses := make([]dto.NotificationResponse, 0, len(notifications))
	for _, notification := range notifications {
		responses = append(responses, *mapNotificationResponse(&notification))
	}
	return responses, nil
}

func (s *notificationService) MarkNotificationRead(ctx context.Context, input *usecase.MarkNotificationReadInput) (*dto.NotificationResponse, error) {
	if input == nil {
		return nil, fmt.Errorf("Dữ liệu đánh dấu đã đọc là bắt buộc")
	}

	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}
	notificationID, err := util.MustHexToObjectID(input.NotificationID)
	if err != nil {
		return nil, err
	}

	updated, err := s.notificationRepo.MarkAsReadByID(ctx, userID, notificationID)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, nil
	}
	return mapNotificationResponse(updated), nil
}

func (s *notificationService) CountUnread(ctx context.Context, userID string) (int64, error) {
	userObjID, err := util.MustHexToObjectID(userID)
	if err != nil {
		return 0, err
	}
	return s.notificationRepo.CountUnreadByUserID(ctx, userObjID)
}

func (s *notificationService) dispatchToUser(ctx context.Context, userID primitive.ObjectID, title string, body string, data map[string]string) (domain.NotificationDeliveryStatus, *string, error) {
	tokens, err := s.notificationTokenRepo.FindActiveByUserID(ctx, userID)
	if err != nil {
		return domain.NotificationDeliveryFailed, strPtr(err.Error()), err
	}
	if len(tokens) == 0 {
		message := fmt.Sprintf("no active notification token for user=%s", userID.Hex())
		log.Printf("[INFO] %s", message)
		return domain.NotificationDeliverySkipped, &message, nil
	}
	if s.pushProvider == nil {
		message := fmt.Sprintf("push provider not configured; skip push for user=%s", userID.Hex())
		log.Printf("[WARN] %s", message)
		return domain.NotificationDeliverySkipped, &message, nil
	}

	var firstErr error
	successCount := 0
	invalidCount := 0

	for _, token := range tokens {
		err := s.pushProvider.Send(ctx, token.Token, title, body, data)
		if err == nil {
			successCount++
			continue
		}

		if errors.Is(err, ErrInvalidPushToken) {
			invalidCount++
			log.Printf("[WARN] deactivating invalid push token for user=%s device=%s: %v", userID.Hex(), token.DeviceID, err)
			if deactivateErr := s.notificationTokenRepo.DeactivateByToken(ctx, token.Token); deactivateErr != nil {
				log.Printf("[WARN] failed to deactivate invalid push token for user=%s device=%s: %v", userID.Hex(), token.DeviceID, deactivateErr)
			}
			continue
		}

		log.Printf("[ERROR] failed to send push notification for user=%s device=%s: %v", userID.Hex(), token.DeviceID, err)
		if firstErr == nil {
			firstErr = err
		}
	}

	if successCount > 0 {
		return domain.NotificationDeliverySent, nil, nil
	}
	if firstErr != nil {
		return domain.NotificationDeliveryFailed, strPtr(firstErr.Error()), firstErr
	}
	if invalidCount == len(tokens) {
		message := fmt.Sprintf("all active tokens became invalid for user=%s", userID.Hex())
		return domain.NotificationDeliverySkipped, &message, nil
	}
	message := fmt.Sprintf("notification skipped for user=%s", userID.Hex())
	return domain.NotificationDeliverySkipped, &message, nil
}

func mapNotificationTokenResponse(token *domain.NotificationToken) *dto.NotificationTokenResponse {
	if token == nil {
		return nil
	}

	return &dto.NotificationTokenResponse{
		ID:         token.ID.Hex(),
		UserID:     token.UserID.Hex(),
		DeviceID:   token.DeviceID,
		Platform:   token.Platform,
		Provider:   token.Provider,
		Token:      token.Token,
		IsActive:   token.IsActive,
		LastSeenAt: token.LastSeenAt,
		CreatedAt:  token.CreatedAt,
		UpdatedAt:  token.UpdatedAt,
	}
}

func mapNotificationResponse(notification *domain.UserNotification) *dto.NotificationResponse {
	if notification == nil {
		return nil
	}

	return &dto.NotificationResponse{
		ID:             notification.ID.Hex(),
		UserID:         notification.UserID.Hex(),
		Type:           notification.Type,
		Title:          notification.Title,
		Body:           notification.Body,
		Data:           cloneStringMap(notification.Data),
		DeliveryStatus: notification.DeliveryStatus,
		DeliveryError:  notification.DeliveryError,
		DeliveredAt:    notification.DeliveredAt,
		IsRead:         notification.ReadAt != nil,
		ReadAt:         notification.ReadAt,
		CreatedAt:      notification.CreatedAt,
		UpdatedAt:      notification.UpdatedAt,
	}
}

func cloneStringMap(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	output := make(map[string]string, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

func strPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
