package realtime

import (
	"net/http"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var rtUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // TODO: restrict in production
	},
}

// Handler handles the /realtime/ws endpoint.
type Handler struct {
	Hub *Hub
}

// NewHandler creates a new realtime Handler.
func NewHandler(hub *Hub) *Handler {
	return &Handler{Hub: hub}
}

// ServeWs upgrades HTTP to WebSocket for user-level realtime notifications.
// @Summary Open realtime WebSocket connection
// @Description Upgrade HTTP request to WebSocket for user-level realtime notifications (e.g., new chat messages, health alerts). Doctor role only.
// @Tags realtime
// @Accept json
// @Produce json
// @Success 101 {string} string "Switching Protocols"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 403 {object} map[string]string "Forbidden"
// @Security BearerAuth
// @Router /realtime/ws [get]
func (h *Handler) ServeWs(c *gin.Context) {
	rawUserID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return
	}

	userID, ok := rawUserID.(string)
	if !ok || userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidUserID})
		return
	}

	conn, err := rtUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &Client{
		UserID: userID,
		Conn:   conn,
		Hub:    h.Hub,
		Send:   make(chan []byte, 256),
	}

	h.Hub.Register <- client

	go client.writePump()
	go client.readPump()
}
