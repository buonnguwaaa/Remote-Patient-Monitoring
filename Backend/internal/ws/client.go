package ws

import (
	"context"
	"encoding/json"
	"log"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
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
	UserID         primitive.ObjectID
	ConversationID primitive.ObjectID
	Conn           *websocket.Conn
	Hub            *Hub
	Send           chan []byte
	ChatService    service.ChatService
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
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
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
			c.writeError("invalid_payload", "invalid request")
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
			c.writeError("unknown_type", "unsupported message type")
		}
	}
}

func (c *Client) handleSendMessage(data json.RawMessage) {
	var incoming incomingMessage
	if err := json.Unmarshal(data, &incoming); err != nil {
		c.writeError("invalid_payload", "invalid message payload")
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
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))

			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
