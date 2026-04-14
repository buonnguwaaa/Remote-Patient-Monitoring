package usecase

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PublishNotificationInput struct {
	Type     domain.NotificationType
	Title    string
	Body     string
	Data     map[string]string
	DedupKey string
}

type ListNotificationsInput struct {
	UnreadOnly bool
	Limit      int
	Offset     int
}

type MarkNotificationReadInput struct {
	UserID         string
	NotificationID string
}

type InternalPublishNotificationInput struct {
	UserID   primitive.ObjectID
	Type     domain.NotificationType
	Title    string
	Body     string
	Data     map[string]string
	DedupKey string
}
