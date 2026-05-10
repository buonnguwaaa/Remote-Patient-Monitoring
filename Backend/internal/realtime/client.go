package realtime

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	rtWriteWait  = 10 * time.Second
	rtPongWait   = 60 * time.Second
	rtPingPeriod = (rtPongWait * 9) / 10
)

// Client represents a single WebSocket connection for a user's realtime notification channel.
type Client struct {
	UserID string
	Conn   *websocket.Conn
	Hub    *Hub
	Send   chan []byte
}

// readPump keeps the connection alive, reading pong/close frames.
// The realtime socket is server-to-client only; any incoming text frames are ignored.
func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(rtPongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(rtPongWait))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[realtime-client] unexpected close for user=%s: %v", c.UserID, err)
			}
			break
		}
		// Discard incoming messages — this socket is server-push only.
	}
}

// writePump sends messages from the Send channel to the WebSocket.
func (c *Client) writePump() {
	ticker := time.NewTicker(rtPingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(rtWriteWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Batch any queued messages separated by newlines
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(rtWriteWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
