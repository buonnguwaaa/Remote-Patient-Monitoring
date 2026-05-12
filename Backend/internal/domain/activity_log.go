package domain

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ActivityType represents the type of activity
type ActivityType string

const (
	ActivityTypeLogin  ActivityType = "login"
	ActivityTypeCreate ActivityType = "create"
	ActivityTypeUpdate ActivityType = "update"
	ActivityTypeDelete ActivityType = "delete"
	ActivityTypeSystem ActivityType = "system"
)

// ActivityLog represents an activity log entry in the system
type ActivityLog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     primitive.ObjectID `bson:"userId" json:"userId"`
	UserName   string             `bson:"userName" json:"userName"`
	UserRole   string             `bson:"userRole" json:"userRole"`
	Type       ActivityType       `bson:"type" json:"type"`
	Action     string             `bson:"action" json:"action"`
	Resource   string             `bson:"resource,omitempty" json:"resource,omitempty"`     // e.g., "doctor", "patient", "department"
	ResourceID string             `bson:"resourceId,omitempty" json:"resourceId,omitempty"` // ID of the affected resource
	Method     string             `bson:"method,omitempty" json:"method,omitempty"`         // HTTP method
	Path       string             `bson:"path,omitempty" json:"path,omitempty"`             // API path
	IPAddress  string             `bson:"ipAddress,omitempty" json:"ipAddress,omitempty"`   // Client IP
	UserAgent  string             `bson:"userAgent,omitempty" json:"userAgent,omitempty"`   // Client user agent
	StatusCode int                `bson:"statusCode,omitempty" json:"statusCode,omitempty"` // HTTP status code
	ErrorMsg   string             `bson:"errorMsg,omitempty" json:"errorMsg,omitempty"`     // Error message if any
	Metadata   map[string]any     `bson:"metadata,omitempty" json:"metadata,omitempty"`     // Additional data
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

// NewActivityLog creates a new activity log entry
func NewActivityLog(userID primitive.ObjectID, userName, userRole string, activityType ActivityType, action string) *ActivityLog {
	return &ActivityLog{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		UserName:  userName,
		UserRole:  userRole,
		Type:      activityType,
		Action:    action,
		CreatedAt: time.Now(),
	}
}
