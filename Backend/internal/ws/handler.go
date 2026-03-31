package ws

import (
	"net/http"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: restrict in production
	},
}

type Handler struct {
	Hub         *Hub
	ChatService service.ChatService
}

func NewHandler(hub *Hub, chatService service.ChatService) *Handler {
	return &Handler{
		Hub:         hub,
		ChatService: chatService,
	}
}

// ServeWs handles WebSocket handshake for real-time chat.
// @Summary Open chat WebSocket connection
// @Description Upgrade HTTP request to WebSocket for real-time messaging. Client must send valid Bearer token and a conversationId query param.
// @Tags chat
// @Accept json
// @Produce json
// @Param conversationId query string true "Conversation ID (ObjectID)"
// @Success 101 {string} string "Switching Protocols"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Failure 404 {object} map[string]string "Conversation not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Security BearerAuth
// @Router /chat/ws [get]
func (h *Handler) ServeWs(c *gin.Context) {
	// 1. Get userID from JWT middleware
	rawUserID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	// 2. Get conversationId from query param
	rawConversationID := c.Query("conversationId")
	if rawConversationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "conversationId is required"})
		return
	}

	userID, err := primitive.ObjectIDFromHex(rawUserID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid userID"})
		return
	}

	conversationID, err := primitive.ObjectIDFromHex(rawConversationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversationId"})
		return
	}

	// 3. Validate participant BEFORE upgrading
	// Must do this before upgrade — once we upgrade, we can't send HTTP error responses anymore
	if err := h.ChatService.ValidateParticipant(c.Request.Context(), &usecase.ValidateParticipantInput{
		ConversationID: conversationID,
		UserID:         userID,
	}); err != nil {
		switch err {
		case service.ErrChatConversationMissing:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case service.ErrChatForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		}
		return
	}

	// 4. Upgrade HTTP → WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// gorilla writes the error to ResponseWriter itself, no need to return JSON
		return
	}

	// 5. Create client and register with hub
	client := &Client{
		UserID:         userID,
		ConversationID: conversationID,
		Conn:           conn,
		Hub:            h.Hub,
		Send:           make(chan []byte, 256),
		ChatService:    h.ChatService,
	}

	h.Hub.Register <- client

	go client.writePump()
	go client.readPump()
}
