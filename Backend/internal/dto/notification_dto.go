package dto

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
)

type NotificationResponse struct {
	ID             string                            `json:"id"`
	UserID         string                            `json:"userId"`
	Type           domain.NotificationType           `json:"type"`
	Title          string                            `json:"title"`
	Body           string                            `json:"body"`
	Data           map[string]string                 `json:"data,omitempty"`
	DeliveryStatus domain.NotificationDeliveryStatus `json:"deliveryStatus"`
	DeliveryError  *string                           `json:"deliveryError,omitempty"`
	DeliveredAt    *time.Time                        `json:"deliveredAt,omitempty"`
	IsRead         bool                              `json:"isRead"`
	ReadAt         *time.Time                        `json:"readAt,omitempty"`
	CreatedAt      time.Time                         `json:"createdAt"`
	UpdatedAt      time.Time                         `json:"updatedAt"`
}

type NotificationUnreadCountResponse struct {
	Count int64 `json:"count"`
}
