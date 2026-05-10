package realtime

import (
	"log"
	"sync"
)

// Hub manages user-level WebSocket clients for realtime notifications.
// Unlike the chat Hub which is keyed by conversationID -> userID,
// this hub is keyed by userID -> set of clients (one per browser tab).
type Hub struct {
	mu         sync.RWMutex
	clients    map[string]map[*Client]struct{} // userID -> set of clients
	Register   chan *Client
	Unregister chan *Client
	Broadcast  chan UserMessage
}

// UserMessage carries a targeted message to a specific user.
type UserMessage struct {
	UserID  string
	Payload []byte
}

// NewHub creates a new realtime Hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]map[*Client]struct{}),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Broadcast:  make(chan UserMessage, 256),
	}
}

// Run starts the hub's event loop. Must be run as a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; !ok {
				h.clients[client.UserID] = make(map[*Client]struct{})
			}
			h.clients[client.UserID][client] = struct{}{}
			h.mu.Unlock()
			log.Printf("[realtime-hub] registered client for user=%s (total=%d)", client.UserID, h.countClientsForUser(client.UserID))

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.UserID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.clients, client.UserID)
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			h.mu.RLock()
			clients, ok := h.clients[message.UserID]
			if !ok {
				h.mu.RUnlock()
				continue
			}
			// Copy the set so we can release the read lock early
			toSend := make([]*Client, 0, len(clients))
			for c := range clients {
				toSend = append(toSend, c)
			}
			h.mu.RUnlock()

			for _, c := range toSend {
				select {
				case c.Send <- message.Payload:
				default:
					// Buffer full — drop this client
					h.mu.Lock()
					if s, ok2 := h.clients[message.UserID]; ok2 {
						delete(s, c)
						close(c.Send)
						if len(s) == 0 {
							delete(h.clients, message.UserID)
						}
					}
					h.mu.Unlock()
				}
			}
		}
	}
}

func (h *Hub) countClientsForUser(userID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients[userID])
}

// SendToUser pushes an event payload to all WebSocket clients for a given user.
func (h *Hub) SendToUser(userID string, payload []byte) {
	h.Broadcast <- UserMessage{UserID: userID, Payload: payload}
}
