package dto

import "time"

// ActivityLogResponse represents the response for an activity log
type ActivityLogResponse struct {
	ID         string         `json:"id"`
	UserID     string         `json:"userId"`
	UserName   string         `json:"userName"`
	UserRole   string         `json:"userRole"`
	Type       string         `json:"type"`
	Action     string         `json:"action"`
	Resource   string         `json:"resource,omitempty"`
	ResourceID string         `json:"resourceId,omitempty"`
	PatientID  string         `json:"patientId,omitempty"`
	Method     string         `json:"method,omitempty"`
	Path       string         `json:"path,omitempty"`
	IPAddress  string         `json:"ipAddress,omitempty"`
	UserAgent  string         `json:"userAgent,omitempty"`
	StatusCode int            `json:"statusCode,omitempty"`
	ErrorMsg   string         `json:"errorMsg,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	CreatedAt  time.Time      `json:"createdAt"`
	Timestamp  string         `json:"timestamp"` // HH:MM format
	Date       string         `json:"date"`      // YYYY-MM-DD format
}

// ActivityLogListResponse represents the response for a list of activity logs
type ActivityLogListResponse struct {
	Data       []ActivityLogResponse `json:"data"`
	Total      int64                 `json:"total"`
	Page       int                   `json:"page"`
	PageSize   int                   `json:"pageSize"`
	TotalPages int                   `json:"totalPages"`
}

// ActivityLogStatsResponse represents statistics for activity logs
type ActivityLogStatsResponse struct {
	Total  int64            `json:"total"`
	ByType map[string]int64 `json:"byType"`
}

// ActivityLogQueryParams represents query parameters for fetching activity logs
type ActivityLogQueryParams struct {
	StartDate    string `form:"startDate" binding:"omitempty"` // YYYY-MM-DD
	EndDate      string `form:"endDate" binding:"omitempty"`   // YYYY-MM-DD
	ActivityType string `form:"type" binding:"omitempty"`      // login, create, update, delete, system, all
	Page         int    `form:"page" binding:"omitempty,min=1"`
	PageSize     int    `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

// ClinicalHistoryQueryParams is used by doctor/nurse clinical history.
type ClinicalHistoryQueryParams struct {
	PatientID string `form:"patientId" binding:"required"`
	Page      int    `form:"page" binding:"omitempty,min=1"`
	PageSize  int    `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

// ClinicalHistoryItem is a chart-oriented activity view (no IP/path/metadata).
type ClinicalHistoryItem struct {
	ID         string    `json:"id"`
	ActorName  string    `json:"actorName"`
	ActorRole  string    `json:"actorRole"`
	Action     string    `json:"action"`
	Resource   string    `json:"resource,omitempty"`
	ResourceID  string    `json:"resourceId,omitempty"`
	PatientID   string    `json:"patientId,omitempty"`
	PatientName string    `json:"patientName,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	Timestamp  string    `json:"timestamp"`
	Date       string    `json:"date"`
}

// ClinicalHistoryListResponse lists clinical history for an assigned patient.
type ClinicalHistoryListResponse struct {
	Data       []ClinicalHistoryItem `json:"data"`
	Total      int64                 `json:"total"`
	Page       int                   `json:"page"`
	PageSize   int                   `json:"pageSize"`
	TotalPages int                   `json:"totalPages"`
}

// AccountActivityQueryParams is used by patient account activity.
type AccountActivityQueryParams struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"pageSize" binding:"omitempty,min=1,max=100"`
}

// AccountActivityItem is a simplified "who changed my chart" view.
type AccountActivityItem struct {
	ID        string    `json:"id"`
	ActorName string    `json:"actorName"`
	ActorRole string    `json:"actorRole"`
	Action    string    `json:"action"`
	CreatedAt time.Time `json:"createdAt"`
	Timestamp string    `json:"timestamp"`
	Date      string    `json:"date"`
}

// AccountActivityListResponse lists the authenticated patient's account activity.
type AccountActivityListResponse struct {
	Data       []AccountActivityItem `json:"data"`
	Total      int64                 `json:"total"`
	Page       int                   `json:"page"`
	PageSize   int                   `json:"pageSize"`
	TotalPages int                   `json:"totalPages"`
}
