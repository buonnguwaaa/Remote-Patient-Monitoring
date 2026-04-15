package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationToken struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID     primitive.ObjectID `json:"userId" bson:"userId"`
	DeviceID   string             `json:"deviceId" bson:"deviceId"`
	Platform   string             `json:"platform" bson:"platform"`
	Provider   string             `json:"provider" bson:"provider"`
	Token      string             `json:"token" bson:"token"`
	IsActive   bool               `json:"isActive" bson:"isActive"`
	LastSeenAt time.Time          `json:"lastSeenAt" bson:"lastSeenAt"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt"`
}
