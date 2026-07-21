package realtime

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Event types for user-level realtime notifications.
const (
	EventTypeChatNewMessage   = "chat.new_message"
	EventTypeChatAlertMessage = "chat.alert_message"

	// Video call events — sent to both doctor and patient userIDs.
	EventTypeVideoCallInvite = "video.call_invite"
	EventTypeVideoCallEnded  = "video.call_ended"

	// Notification event
	EventTypeNotificationCreated = "notification.created"
)

// RealtimeEventData holds the inner data for a realtime event.
type RealtimeEventData struct {
	ConversationID string               `json:"conversationId"`
	MessageID      string               `json:"messageId"`
	SenderID       *string              `json:"senderId"`
	MessageSource  string               `json:"messageSource"`
	PatientID      *string              `json:"patientId,omitempty"`
	RelatedAlertID *string              `json:"relatedAlertId,omitempty"`
	Severity       *string              `json:"severity,omitempty"`
	Preview        string               `json:"preview"`
	Message        *dto.MessageResponse `json:"message,omitempty"`
	Notification   *dto.NotificationResponse `json:"notification,omitempty"`
}

// RealtimeEvent is the top-level JSON structure sent to clients via the realtime WebSocket.
type RealtimeEvent struct {
	Type      string            `json:"type"`
	EventID   string            `json:"eventId"`
	CreatedAt string            `json:"createdAt"`
	Data      RealtimeEventData `json:"data"`
}

// NewChatMessageEventID builds a stable, idempotent event ID for a regular chat message notification.
func NewChatMessageEventID(messageID, recipientUserID string) string {
	return fmt.Sprintf("chat:new_message:%s:recipient:%s", messageID, recipientUserID)
}

// NewAlertMessageEventID builds a stable, idempotent event ID for a system alert message notification.
func NewAlertMessageEventID(messageID, doctorID string) string {
	return fmt.Sprintf("chat:alert_message:%s:recipient:%s", messageID, doctorID)
}

// BuildChatNewMessageEvent creates a realtime event for a normal user chat message.
func BuildChatNewMessageEvent(
	msg *dto.MessageResponse,
	recipientUserID string,
) RealtimeEvent {
	var senderID *string
	if msg.SenderID != nil {
		s := msg.SenderID.Hex()
		senderID = &s
	}

	return RealtimeEvent{
		Type:      EventTypeChatNewMessage,
		EventID:   NewChatMessageEventID(msg.ID.Hex(), recipientUserID),
		CreatedAt: msg.CreatedAt.UTC().Format(time.RFC3339),
		Data: RealtimeEventData{
			ConversationID: msg.ConversationID.Hex(),
			MessageID:      msg.ID.Hex(),
			SenderID:       senderID,
			MessageSource:  string(msg.MessageSource),
			Preview:        SanitizePreview(msg.Content),
			Message:        msg,
		},
	}
}

// BuildChatAlertMessageEvent creates a realtime event for a system alert chat message.
func BuildChatAlertMessageEvent(
	msg *dto.MessageResponse,
	doctorID string,
	patientID *primitive.ObjectID,
	alertID *primitive.ObjectID,
	severity *string,
) RealtimeEvent {
	var patientIDStr *string
	if patientID != nil {
		s := patientID.Hex()
		patientIDStr = &s
	}
	var alertIDStr *string
	if alertID != nil {
		s := alertID.Hex()
		alertIDStr = &s
	}

	return RealtimeEvent{
		Type:      EventTypeChatAlertMessage,
		EventID:   NewAlertMessageEventID(msg.ID.Hex(), doctorID),
		CreatedAt: msg.CreatedAt.UTC().Format(time.RFC3339),
		Data: RealtimeEventData{
			ConversationID: msg.ConversationID.Hex(),
			MessageID:      msg.ID.Hex(),
			SenderID:       nil,
			MessageSource:  "system",
			PatientID:      patientIDStr,
			RelatedAlertID: alertIDStr,
			Severity:       severity,
			Preview:        "Có cảnh báo sức khỏe mới cần kiểm tra.",
			Message:        msg,
		},
	}
}

// VideoCallEventData holds data for video call invite/ended events.
// joinUrl is NOT included here — the patient must call POST /video-sessions/:id/join
// to receive the joinUrl after backend validates their permission.
type VideoCallEventData struct {
	VideoSessionID string `json:"videoSessionId"`
	ConversationID string `json:"conversationId"`
	DoctorID       string `json:"doctorId"`
	PatientID      string `json:"patientId"`
}

// BuildVideoCallInviteEvent creates a realtime event notifying the patient of an incoming call.
func BuildVideoCallInviteEvent(sessionID, conversationID, doctorID, patientID string) RealtimeEvent {
	return RealtimeEvent{
		Type:      EventTypeVideoCallInvite,
		EventID:   fmt.Sprintf("video:invite:%s:recipient:%s", sessionID, patientID),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		Data:      RealtimeEventData{ConversationID: conversationID},
	}
}

// BuildVideoCallEndedEvent creates a realtime event notifying a participant that the call ended.
func BuildVideoCallEndedEvent(sessionID, conversationID, recipientID string) RealtimeEvent {
	return RealtimeEvent{
		Type:      EventTypeVideoCallEnded,
		EventID:   fmt.Sprintf("video:ended:%s:recipient:%s", sessionID, recipientID),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		Data:      RealtimeEventData{ConversationID: conversationID},
	}
}

var multiSpaceRe = regexp.MustCompile(`\s+`)

// SanitizePreview trims, collapses whitespace, and truncates to a reasonable length for preview display.
func SanitizePreview(content string) string {
	s := strings.TrimSpace(content)
	s = multiSpaceRe.ReplaceAllString(s, " ")
	if len([]rune(s)) > 140 {
		return string([]rune(s)[:140])
	}
	return s
}
