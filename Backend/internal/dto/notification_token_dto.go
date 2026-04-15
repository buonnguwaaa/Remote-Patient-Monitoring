package dto

import "time"

type RegisterNotificationTokenRequest struct {
	DeviceID string `json:"deviceId" binding:"required"`
	Platform string `json:"platform" binding:"required"`
	Provider string `json:"provider" binding:"required"`
	Token    string `json:"token" binding:"required"`
}

type DeactivateNotificationTokenRequest struct {
	DeviceID string `json:"deviceId" binding:"required"`
}

type NotificationTokenResponse struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	DeviceID   string    `json:"deviceId"`
	Platform   string    `json:"platform"`
	Provider   string    `json:"provider"`
	Token      string    `json:"token"`
	IsActive   bool      `json:"isActive"`
	LastSeenAt time.Time `json:"lastSeenAt"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
