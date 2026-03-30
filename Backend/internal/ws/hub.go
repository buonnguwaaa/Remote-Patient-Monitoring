package ws

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Hub struct {
	Clients    map[primitive.ObjectID]map[primitive.ObjectID]*Client // conversationID -> userID -> Client
	Broadcast  chan BroadcastMessage
	Register   chan *Client
	Unregister chan *Client
}

type BroadcastMessage struct {
	ConversationID primitive.ObjectID
	Message        []byte
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[primitive.ObjectID]map[primitive.ObjectID]*Client),
		Broadcast:  make(chan BroadcastMessage),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			if _, ok := h.Clients[client.ConversationID]; !ok {
				h.Clients[client.ConversationID] = make(map[primitive.ObjectID]*Client)
			}
			h.Clients[client.ConversationID][client.UserID] = client

		case client := <-h.Unregister:
			if _, ok := h.Clients[client.ConversationID][client.UserID]; ok {
				delete(h.Clients[client.ConversationID], client.UserID)
				close(client.Send)

				// cleanup inner map if conversation is now empty
				if len(h.Clients[client.ConversationID]) == 0 {
					delete(h.Clients, client.ConversationID)
				}
			}

		case message := <-h.Broadcast:
			for _, client := range h.Clients[message.ConversationID] {
				select {
				case client.Send <- message.Message:
				default:
					close(client.Send)
					delete(h.Clients[message.ConversationID], client.UserID)
				}
			}
		}
	}
}
