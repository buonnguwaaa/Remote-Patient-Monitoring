package ws

import (
	"context"
	"encoding/json"
	"log"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/realtime"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

type Client struct {
	UserID              primitive.ObjectID
	ConversationID      primitive.ObjectID
	Conn                *websocket.Conn
	Hub                 *Hub
	Send                chan []byte
	ChatService         service.ChatService
	RealtimePublisher   *realtime.RedisUserEventPublisher
	NotificationService service.NotificationService
	UserService         service.UserService
}

type wsRequest struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type incomingMessage struct {
	Content          string              `json:"content"`
	ReplyToMessageID *primitive.ObjectID `json:"replyToMessageId,omitempty"`
	RelatedAlertID   *primitive.ObjectID `json:"relatedAlertId,omitempty"`
}

type deliveredPayload struct {
	MessageID primitive.ObjectID `json:"messageId"`
}

type readPayload struct {
	LastReadMessageID primitive.ObjectID `json:"lastReadMessageId"`
}

type wsErrorPayload struct {
	Type  string `json:"type"`
	Code  string `json:"code"`
	Error string `json:"error"`
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Printf("failed to set read deadline: %v", err)
	}
	c.Conn.SetPongHandler(func(string) error {
		if err := c.Conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			log.Printf("failed to set read deadline in pong handler: %v", err)
		}
		return nil
	})

	for {
		_, raw, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
			) {
				log.Printf("unexpected close: %v", err)
			}
			break
		}

		var req wsRequest
		if err := json.Unmarshal(raw, &req); err != nil {
			c.writeError("invalid_payload", "Yêu cầu không hợp lệ")
			continue
		}

		switch req.Type {

		case "SEND_MESSAGE":
			c.handleSendMessage(req.Data)

		case "DELIVERED":
			c.handleDelivered(req.Data)

		case "READ":
			c.handleRead(req.Data)

		default:
			c.writeError("unknown_type", "Loại tin nhắn không được hỗ trợ")
		}
	}
}

func (c *Client) handleSendMessage(data json.RawMessage) {
	var incoming incomingMessage
	if err := json.Unmarshal(data, &incoming); err != nil {
		c.writeError("invalid_payload", "Dữ liệu tin nhắn không hợp lệ")
		return
	}

	saved, err := c.ChatService.SendMessage(context.Background(), &usecase.SendMessageInput{
		ConversationID:   c.ConversationID,
		MessageSource:    domain.UserMessage,
		SenderID:         &c.UserID,
		Content:          incoming.Content,
		ReplyToMessageID: incoming.ReplyToMessageID,
		RelatedAlertID:   incoming.RelatedAlertID,
	})
	if err != nil {
		log.Printf("failed to save message: %v", err)
		c.writeError("send_failed", err.Error())
		return
	}

	payload, _ := json.Marshal(map[string]interface{}{
		"type": "NEW_MESSAGE",
		"data": saved,
	})

	c.Hub.Broadcast <- BroadcastMessage{
		ConversationID: c.ConversationID,
		Message:        payload,
	}

	// Publish user-level realtime event for participants other than the sender.
	// This allows the doctor to get a notification on other pages/tabs.
	c.publishUserEventForNewMessage(saved)

	// Send FCM push notification to recipient
	c.sendPushNotificationForNewMessage(saved)
}

// publishUserEventForNewMessage publishes a user-level notification event
// for all participants of the conversation except the sender.
func (c *Client) publishUserEventForNewMessage(saved interface{}) {
	if c.RealtimePublisher == nil {
		return
	}

	// Get conversation to find all participants
	conv, err := c.ChatService.GetConversationByID(context.Background(), c.ConversationID)
	if err != nil || conv == nil {
		log.Printf("warn: failed to get conversation for user event publish: %v", err)
		return
	}

	// Re-marshal and re-unmarshal to extract fields portably.
	// saved is *dto.MessageResponse from ChatService.SendMessage.
	msgBytes, err := json.Marshal(saved)
	if err != nil {
		log.Printf("warn: failed to marshal saved message for user event: %v", err)
		return
	}

	var msgFields struct {
		ID             string  `json:"id"`
		ConversationID string  `json:"conversationId"`
		MessageSource  string  `json:"messageSource"`
		SenderID       *string `json:"senderId"`
		Content        string  `json:"content"`
		CreatedAt      string  `json:"createdAt"`
	}
	if err := json.Unmarshal(msgBytes, &msgFields); err != nil {
		log.Printf("warn: failed to unmarshal saved message fields for user event: %v", err)
		return
	}

	for _, p := range conv.Participants {
		if p.UserID.Hex() == c.UserID.Hex() {
			continue // skip sender
		}

		recipientID := p.UserID.Hex()
		event := realtime.RealtimeEvent{
			Type:      realtime.EventTypeChatNewMessage,
			EventID:   realtime.NewChatMessageEventID(msgFields.ID, recipientID),
			CreatedAt: msgFields.CreatedAt,
			Data: realtime.RealtimeEventData{
				ConversationID: msgFields.ConversationID,
				MessageID:      msgFields.ID,
				SenderID:       msgFields.SenderID,
				MessageSource:  msgFields.MessageSource,
				Preview:        realtime.SanitizePreview(msgFields.Content),
			},
		}

		if err := c.RealtimePublisher.Publish(context.Background(), recipientID, event); err != nil {
			log.Printf("warn: failed to publish user event for recipient=%s: %v", recipientID, err)
		}
	}
}

// sendPushNotificationForNewMessage sends FCM push notification to recipients
func (c *Client) sendPushNotificationForNewMessage(saved interface{}) {
	if c.NotificationService == nil || c.UserService == nil {
		return
	}

	// Get conversation to find all participants
	conv, err := c.ChatService.GetConversationByID(context.Background(), c.ConversationID)
	if err != nil || conv == nil {
		log.Printf("warn: failed to get conversation for FCM notification: %v", err)
		return
	}

	// Re-marshal to extract message fields
	msgBytes, err := json.Marshal(saved)
	if err != nil {
		log.Printf("warn: failed to marshal saved message for FCM: %v", err)
		return
	}

	var msgFields struct {
		ID             string  `json:"id"`
		ConversationID string  `json:"conversationId"`
		SenderID       *string `json:"senderId"`
		Content        string  `json:"content"`
	}
	if err := json.Unmarshal(msgBytes, &msgFields); err != nil {
		log.Printf("warn: failed to unmarshal saved message fields for FCM: %v", err)
		return
	}

	// Get sender name
	senderName := "Bệnh nhân"
	if msgFields.SenderID != nil {
		sender, err := c.UserService.GetBaseUserByID(context.Background(), &usecase.GetUserByIDInput{ID: *msgFields.SenderID})
		if err == nil && sender != nil {
			senderName = sender.Name
		}
	}

	// Prepare notification content
	preview := msgFields.Content
	if len(preview) > 100 {
		preview = preview[:97] + "..."
	}

	// Send to each recipient (except sender)
	for _, p := range conv.Participants {
		if p.UserID.Hex() == c.UserID.Hex() {
			continue // skip sender
		}

		recipientID := p.UserID

		// Send FCM notification
		data := map[string]string{
			"type":           "new_message",
			"conversationId": msgFields.ConversationID,
			"messageId":      msgFields.ID,
			"senderId":       c.UserID.Hex(),
		}

		err := c.NotificationService.SendToUser(
			context.Background(),
			recipientID,
			senderName,
			preview,
			data,
		)

		if err != nil {
			log.Printf("warn: failed to send FCM notification to user=%s: %v", recipientID.Hex(), err)
		} else {
			log.Printf("[INFO] sent FCM notification for new message to user=%s", recipientID.Hex())
		}
	}
}

func (c *Client) handleDelivered(data json.RawMessage) {
	var payload deliveredPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return
	}

	err := c.ChatService.UpdateParticipantState(
		context.Background(),
		&usecase.UpdateParticipantStateInput{
			ConversationID:         c.ConversationID,
			UserID:                 c.UserID,
			LastReadMessageID:      nil,
			LastDeliveredMessageID: &payload.MessageID,
		},
	)

	if err != nil {
		log.Printf("failed to update delivered state: %v", err)
		return
	}

	res, _ := json.Marshal(map[string]interface{}{
		"type": "DELIVERED",
		"data": map[string]interface{}{
			"userId":    c.UserID,
			"messageId": payload.MessageID,
		},
	})

	c.Hub.Broadcast <- BroadcastMessage{
		ConversationID: c.ConversationID,
		Message:        res,
	}
}

func (c *Client) handleRead(data json.RawMessage) {
	var payload readPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return
	}

	err := c.ChatService.UpdateParticipantState(
		context.Background(),
		&usecase.UpdateParticipantStateInput{
			ConversationID:         c.ConversationID,
			UserID:                 c.UserID,
			LastReadMessageID:      &payload.LastReadMessageID,
			LastDeliveredMessageID: nil,
		},
	)
	if err != nil {
		log.Printf("failed to update read state: %v", err)
		return
	}

	res, _ := json.Marshal(map[string]interface{}{
		"type": "READ",
		"data": map[string]interface{}{
			"userId":            c.UserID,
			"lastReadMessageId": payload.LastReadMessageID,
		},
	})

	c.Hub.Broadcast <- BroadcastMessage{
		ConversationID: c.ConversationID,
		Message:        res,
	}
}

func (c *Client) writeError(code, message string) {
	payload, err := json.Marshal(wsErrorPayload{
		Type:  "error",
		Code:  code,
		Error: message,
	})
	if err != nil {
		log.Printf("failed to marshal ws error payload: %v", err)
		return
	}

	select {
	case c.Send <- payload:
	default:
		log.Printf("dropping ws error payload for user %s: send buffer full", c.UserID.Hex())
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("failed to set write deadline: %v", err)
				return
			}

			if !ok {
				if err := c.Conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("failed to write close message: %v", err)
				}
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := w.Write(message); err != nil {
				return
			}

			n := len(c.Send)
			for i := 0; i < n; i++ {
				if _, err := w.Write([]byte{'\n'}); err != nil {
					return
				}
				if _, err := w.Write(<-c.Send); err != nil {
					return
				}
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("failed to set write deadline: %v", err)
				return
			}
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
