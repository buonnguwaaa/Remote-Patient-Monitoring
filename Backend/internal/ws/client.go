package ws

import (
	"context"
	"encoding/json"
	"log"
	"time"

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

type incomingMessage struct {
	Content          string              `json:"content"`
	ReplyToMessageID *primitive.ObjectID `json:"replyToMessageId,omitempty"`
	RelatedAlertID   *primitive.ObjectID `json:"relatedAlertId,omitempty"`
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

		var incoming incomingMessage
		if err := json.Unmarshal(raw, &incoming); err != nil {
			log.Printf("invalid message format from user %s: %v", c.UserID.Hex(), err)
			continue
		}

		saved, err := c.ChatService.SendMessage(context.Background(), &usecase.SendMessageInput{
			ConversationID:   c.ConversationID,
			SenderID:         c.UserID,
			Content:          incoming.Content,
			ReplyToMessageID: incoming.ReplyToMessageID,
			RelatedAlertID:   incoming.RelatedAlertID,
		})
		if err != nil {
			log.Printf("failed to save message from user %s: %v", c.UserID.Hex(), err)
			continue
		}

		payload, err := json.Marshal(saved)
		if err != nil {
			log.Printf("failed to marshal message: %v", err)
			continue
		}

		c.Hub.Broadcast <- BroadcastMessage{
			ConversationID: c.ConversationID,
			Message:        payload,
		}
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
