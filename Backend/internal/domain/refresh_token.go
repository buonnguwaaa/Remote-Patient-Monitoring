package domain

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type RefreshToken struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID    primitive.ObjectID `json:"userId" bson:"userId"`
	TokenHash string             `json:"tokenHash" bson:"tokenHash"`
	ExpiresAt time.Time          `json:"expiresAt" bson:"expiresAt"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt"`
	RevokedAt *time.Time         `json:"revokedAt,omitempty" bson:"revokedAt,omitempty"`
}
