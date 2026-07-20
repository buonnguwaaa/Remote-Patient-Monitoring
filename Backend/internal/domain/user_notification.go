package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationType string

const (
	NotificationTypeAlert       NotificationType = "alert"
	NotificationTypeReminder    NotificationType = "reminder"
	NotificationTypeAppointment NotificationType = "appointment"
	NotificationTypeAssignment  NotificationType = "assignment"
)

type NotificationDeliveryStatus string

const (
	NotificationDeliveryPending NotificationDeliveryStatus = "pending"
	NotificationDeliverySent    NotificationDeliveryStatus = "sent"
	NotificationDeliverySkipped NotificationDeliveryStatus = "skipped"
	NotificationDeliveryFailed  NotificationDeliveryStatus = "failed"
)

type UserNotification struct {
	ID             primitive.ObjectID         `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID         `json:"userId" bson:"userId"`
	Type           NotificationType           `json:"type" bson:"type"`
	Title          string                     `json:"title" bson:"title"`
	Body           string                     `json:"body" bson:"body"`
	Data           map[string]string          `json:"data,omitempty" bson:"data,omitempty"`
	DedupKey       string                     `json:"dedupKey" bson:"dedupKey"`
	DeliveryStatus NotificationDeliveryStatus `json:"deliveryStatus" bson:"deliveryStatus"`
	DeliveryError  *string                    `json:"deliveryError,omitempty" bson:"deliveryError,omitempty"`
	DeliveredAt    *time.Time                 `json:"deliveredAt,omitempty" bson:"deliveredAt,omitempty"`
	ReadAt         *time.Time                 `json:"readAt,omitempty" bson:"readAt,omitempty"`
	CreatedAt      time.Time                  `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time                  `json:"updatedAt" bson:"updatedAt"`
}
