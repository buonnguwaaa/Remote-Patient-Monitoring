package service

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	repository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	ErrChatInvalidParticipants = errors.New("chat: invalid participants")
	ErrChatConversationMissing = errors.New("chat: conversation not found")
	ErrChatInvalidMessage      = errors.New("chat: invalid message")
	ErrChatInvalidReplyTarget  = errors.New("chat: invalid reply target")
	ErrChatForbidden           = errors.New("chat: user is not a participant")
)

type ChatService interface {
	CreateConversation(ctx context.Context, input *usecase.CreateConversationInput) (*dto.ConversationResponse, error)
	GetConversationByID(ctx context.Context, conversationID primitive.ObjectID) (*dto.ConversationResponse, error)
	GetUserConversations(ctx context.Context, input *usecase.GetUserConversationsInput) (*dto.GetConversationsResponse, error)
	SendMessage(ctx context.Context, input *usecase.SendMessageInput) (*dto.MessageResponse, error)
	GetConversationMessages(ctx context.Context, input *usecase.GetConversationMessagesInput) (*dto.GetMessagesResponse, error)
	ValidateParticipant(ctx context.Context, input *usecase.ValidateParticipantInput) error
}

type chatService struct {
	conversationRepo repository.ConversationRepository
	messageRepo      repository.MessageRepository
}

func NewChatService(conversationRepo repository.ConversationRepository, messageRepo repository.MessageRepository) ChatService {
	return &chatService{
		conversationRepo: conversationRepo,
		messageRepo:      messageRepo,
	}
}

func (s *chatService) CreateConversation(ctx context.Context, input *usecase.CreateConversationInput) (*dto.ConversationResponse, error) {
	if input == nil {
		return nil, ErrChatInvalidParticipants
	}

	uniqueParticipants := uniqueObjectIDs(input.ParticipantIDs)
	if len(uniqueParticipants) < 2 {
		return nil, ErrChatInvalidParticipants
	}

	existing, err := s.conversationRepo.FindByParticipants(ctx, uniqueParticipants)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return mapConversationToDTO(existing), nil
	}

	conversation := &chatDomain.Conversation{
		ParticipantIDs: uniqueParticipants,
	}

	inserted, err := s.conversationRepo.Create(ctx, conversation)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			existing, findErr := s.conversationRepo.FindByParticipants(ctx, uniqueParticipants)
			if findErr != nil {
				return nil, findErr
			}
			if existing != nil {
				return mapConversationToDTO(existing), nil
			}
		}
		return nil, err
	}

	return mapConversationToDTO(inserted), nil
}

func (s *chatService) GetConversationByID(ctx context.Context, conversationID primitive.ObjectID) (*dto.ConversationResponse, error) {
	if conversationID.IsZero() {
		return nil, ErrChatConversationMissing
	}

	conversation, err := s.conversationRepo.FindByID(ctx, conversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, ErrChatConversationMissing
	}

	return mapConversationToDTO(conversation), nil
}

func (s *chatService) GetUserConversations(ctx context.Context, input *usecase.GetUserConversationsInput) (*dto.GetConversationsResponse, error) {
	if input == nil || input.UserID.IsZero() {
		return nil, ErrChatInvalidParticipants
	}

	limit := input.Limit

	conversations, err := s.conversationRepo.FindWithFilter(ctx, repository.ConversationFilter{
		ParticipantID: input.UserID,
		Cursor:        input.Cursor,
		Limit:         limit,
		FetchOneExtra: true, // turn on fetchOneExtra to determine hasMore
	})
	if err != nil {
		return nil, err
	}

	hasMore := len(conversations) > limit
	nextCursor := ""
	if !hasMore {
		return &dto.GetConversationsResponse{
			Conversations: mapConversationsToDTO(conversations),
			Paging: dto.Paging{
				HasMore:    false,
				NextCursor: "",
			},
		}, nil
	}

	conversations = conversations[:limit]
	nextCursor = conversations[len(conversations)-1].UpdatedAt.UTC().Format(time.RFC3339Nano)

	return &dto.GetConversationsResponse{
		Conversations: mapConversationsToDTO(conversations),
		Paging: dto.Paging{
			HasMore:    true,
			NextCursor: nextCursor,
		},
	}, nil
}

func (s *chatService) SendMessage(ctx context.Context, input *usecase.SendMessageInput) (*dto.MessageResponse, error) {
	if input == nil || input.ConversationID.IsZero() || input.SenderID.IsZero() || strings.TrimSpace(input.Content) == "" {
		return nil, ErrChatInvalidMessage
	}

	conversation, err := s.conversationRepo.FindByID(ctx, input.ConversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, ErrChatConversationMissing
	}
	if !containsObjectID(conversation.ParticipantIDs, input.SenderID) {
		return nil, ErrChatForbidden
	}

	if input.ReplyToMessageID != nil {
		replyToMessage, err := s.messageRepo.FindByID(ctx, *input.ReplyToMessageID)
		if err != nil {
			return nil, err
		}
		if replyToMessage == nil || replyToMessage.ConversationID != input.ConversationID {
			return nil, ErrChatInvalidReplyTarget
		}
	}

	message := &chatDomain.Message{
		ConversationID:   input.ConversationID,
		SenderID:         input.SenderID,
		Content:          strings.TrimSpace(input.Content),
		ReplyToMessageID: input.ReplyToMessageID,
		RelatedAlertID:   input.RelatedAlertID,
	}

	created, err := s.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, err
	}

	if err := s.conversationRepo.TouchUpdatedAt(ctx, input.ConversationID); err != nil {
		log.Printf("warn: failed to touch conversation updatedAt: %v", err)
	}

	return mapMessageToDTO(created), nil
}

func (s *chatService) GetConversationMessages(ctx context.Context, input *usecase.GetConversationMessagesInput) (*dto.GetMessagesResponse, error) {
	if input == nil || input.ConversationID.IsZero() || input.RequesterID.IsZero() {
		return nil, ErrChatInvalidMessage
	}

	conversation, err := s.conversationRepo.FindByID(ctx, input.ConversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, ErrChatConversationMissing
	}
	if !containsObjectID(conversation.ParticipantIDs, input.RequesterID) {
		return nil, ErrChatForbidden
	}

	limit := input.Limit

	messages, err := s.messageRepo.FindWithFilter(ctx, repository.MessageFilter{
		ConversationID: input.ConversationID,
		Cursor:         input.Cursor,
		Limit:          limit,
		FetchOneExtra:  true, // turn on fetchOneExtra to determine hasMore
	})
	if err != nil {
		return nil, err
	}

	hasMore := len(messages) > limit
	nextCursor := ""
	if !hasMore {
		return &dto.GetMessagesResponse{
			Messages: mapMessagesToDTO(messages),
			Paging: dto.Paging{
				HasMore:    false,
				NextCursor: "",
			},
		}, nil
	}

	messages = messages[:limit]
	nextCursor = messages[len(messages)-1].ID.Hex()

	return &dto.GetMessagesResponse{
		Messages: mapMessagesToDTO(messages),
		Paging: dto.Paging{
			HasMore:    true,
			NextCursor: nextCursor,
		},
	}, nil
}

func (s *chatService) ValidateParticipant(ctx context.Context, input *usecase.ValidateParticipantInput) error {
	if input == nil || input.ConversationID.IsZero() || input.UserID.IsZero() {
		return ErrChatInvalidParticipants
	}

	conversation, err := s.conversationRepo.FindByID(ctx, input.ConversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return ErrChatConversationMissing
	}
	if !containsObjectID(conversation.ParticipantIDs, input.UserID) {
		return ErrChatForbidden
	}
	return nil
}

func uniqueObjectIDs(ids []primitive.ObjectID) []primitive.ObjectID {
	seen := make(map[primitive.ObjectID]struct{}, len(ids))
	result := make([]primitive.ObjectID, 0, len(ids))

	for _, id := range ids {
		if id.IsZero() {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		result = append(result, id)
	}

	return result
}

func containsObjectID(ids []primitive.ObjectID, target primitive.ObjectID) bool {
	for _, id := range ids {
		if id == target {
			return true
		}
	}
	return false
}

func mapConversationToDTO(c *chatDomain.Conversation) *dto.ConversationResponse {
	if c == nil {
		return nil
	}

	return &dto.ConversationResponse{
		ID:             c.ID,
		ParticipantIDs: c.ParticipantIDs,
		CreatedAt:      c.CreatedAt,
		UpdatedAt:      c.UpdatedAt,
	}
}

func mapConversationsToDTO(conversations []*chatDomain.Conversation) []dto.ConversationResponse {
	results := make([]dto.ConversationResponse, 0, len(conversations))
	for _, c := range conversations {
		mapped := mapConversationToDTO(c)
		if mapped != nil {
			results = append(results, *mapped)
		}
	}
	return results
}

func mapMessageToDTO(m *chatDomain.Message) *dto.MessageResponse {
	if m == nil {
		return nil
	}

	return &dto.MessageResponse{
		ID:               m.ID,
		ConversationID:   m.ConversationID,
		SenderID:         m.SenderID,
		Content:          m.Content,
		ReplyToMessageID: m.ReplyToMessageID,
		RelatedAlertID:   m.RelatedAlertID,
		CreatedAt:        m.CreatedAt,
		UpdatedAt:        m.CreatedAt,
	}
}

func mapMessagesToDTO(messages []*chatDomain.Message) []dto.MessageResponse {
	results := make([]dto.MessageResponse, 0, len(messages))
	for _, m := range messages {
		mapped := mapMessageToDTO(m)
		if mapped != nil {
			results = append(results, *mapped)
		}
	}
	return results
}
