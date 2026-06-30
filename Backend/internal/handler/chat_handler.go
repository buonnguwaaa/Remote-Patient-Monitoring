package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/constant"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatHandler struct {
	chatService service.ChatService
}

func NewChatHandler(chatService service.ChatService) *ChatHandler {
	return &ChatHandler{chatService: chatService}
}

// CreateConversation creates a new conversation with the specified participants.
// @Summary Create a new conversation
// @Tags chat
// @Accept json
// @Produce json
// @Param conversation body dto.CreateConversationRequest true "Conversation info"
// @Success 201 {object} map[string]interface{} "Conversation created successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /chat/conversations [post]
func (h *ChatHandler) CreateConversation(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	var req dto.CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	participantIDs := make([]primitive.ObjectID, 0, len(req.ParticipantIDs)+1)
	participantIDs = append(participantIDs, req.ParticipantIDs...)
	participantIDs = append(participantIDs, userID)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	conversation, err := h.chatService.CreateConversation(ctx, &usecase.CreateConversationInput{ParticipantIDs: participantIDs})
	if err != nil {
		switch err {
		case service.ErrChatInvalidParticipants:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case service.ErrChatAssignmentMismatch:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgInternalServerError})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    conversation,
		"message": "Tạo cuộc trò chuyện thành công",
	})
}

// GetConversations retrieves the list of conversations for the authenticated user.
// @Summary Get user conversations
// @Tags chat
// @Accept json
// @Produce json
// @Param limit query int false "Number of conversations to retrieve"
// @Param cursor query string false "Cursor for pagination"
// @Success 200 {object} map[string]interface{} "Conversations retrieved successfully"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /chat/conversations [get]
func (h *ChatHandler) GetConversations(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 {
		limit = 20
	}

	var cursor time.Time
	rawCursor := c.Query("cursor")
	if rawCursor != "" {
		cursor, err = time.Parse(time.RFC3339Nano, rawCursor)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidCursor})
			return
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.chatService.GetUserConversations(ctx, &usecase.GetUserConversationsInput{
		UserID: userID,
		Cursor: cursor,
		Limit:  limit,
	})
	if err != nil {
		if err == service.ErrChatInvalidParticipants {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgInternalServerError})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    resp,
		"message": "Lấy danh sách cuộc trò chuyện thành công",
	})
}

// GetMessages retrieves messages in a conversation with pagination support
// @Summary Get conversation messages
// @Tags chat
// @Accept json
// @Produce json
// @Param id path string true "Conversation ID"
// @Param limit query int false "Number of messages to retrieve"
// @Param cursor query string false "Cursor for pagination"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /chat/conversations/{id}/messages [get]
func (h *ChatHandler) GetMessages(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		return
	}

	conversationID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidConversationID})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 {
		limit = 20
	}

	var cursor primitive.ObjectID
	rawCursor := c.Query("cursor")
	if rawCursor != "" {
		cursor, err = primitive.ObjectIDFromHex(rawCursor)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidCursor})
			return
		}
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	resp, err := h.chatService.GetConversationMessages(ctx, &usecase.GetConversationMessagesInput{
		ConversationID: conversationID,
		RequesterID:    userID,
		Cursor:         cursor,
		Limit:          limit,
	})
	if err != nil {
		switch err {
		case service.ErrChatInvalidMessage:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case service.ErrChatConversationMissing:
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case service.ErrChatForbidden:
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": constant.MsgInternalServerError})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    resp,
		"message": "Lấy tin nhắn thành công",
	})
}

func getUserIDFromContext(c *gin.Context) (primitive.ObjectID, bool) {
	rawUserID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return primitive.NilObjectID, false
	}

	userIDHex, ok := rawUserID.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": constant.MsgUnauthorized})
		return primitive.NilObjectID, false
	}

	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": constant.MsgInvalidUserID})
		return primitive.NilObjectID, false
	}

	return userID, true
}
