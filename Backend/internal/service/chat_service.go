package service

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	repository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrChatInvalidParticipants = errors.New("Người tham gia không hợp lệ")
	ErrChatConversationMissing = errors.New("Không tìm thấy cuộc trò chuyện")
	ErrChatInvalidMessage      = errors.New("Tin nhắn không hợp lệ")
	ErrChatInvalidReplyTarget  = errors.New("Tin nhắn trả lời không hợp lệ")
	ErrChatForbidden           = errors.New("Người dùng không phải thành viên cuộc trò chuyện")
	ErrChatAssignmentMismatch  = errors.New("Người tham gia phải có bản ghi phân công")
)

type ChatService interface {
	CreateConversation(ctx context.Context, input *usecase.CreateConversationInput) (*dto.ConversationResponse, error)
	FindConversationByParticipants(ctx context.Context, participantIDs []primitive.ObjectID) (*dto.ConversationResponse, error)
	GetConversationByID(ctx context.Context, conversationID primitive.ObjectID) (*dto.ConversationResponse, error)
	GetUserConversations(ctx context.Context, input *usecase.GetUserConversationsInput) (*dto.GetConversationsResponse, error)
	SendMessage(ctx context.Context, input *usecase.SendMessageInput) (*dto.MessageResponse, error)
	GetConversationMessages(ctx context.Context, input *usecase.GetConversationMessagesInput) (*dto.GetMessagesResponse, error)
	ValidateParticipant(ctx context.Context, input *usecase.ValidateParticipantInput) error
	UpdateParticipantState(ctx context.Context, input *usecase.UpdateParticipantStateInput) error
}

type chatService struct {
	conversationRepo chatRepository.ConversationRepository
	messageRepo      chatRepository.MessageRepository
	assignmentRepo   repository.AssignmentRepository
}

func NewChatService(
	conversationRepo chatRepository.ConversationRepository,
	messageRepo chatRepository.MessageRepository,
	assignmentRepo repository.AssignmentRepository,
) ChatService {
	return &chatService{
		conversationRepo: conversationRepo,
		messageRepo:      messageRepo,
		assignmentRepo:   assignmentRepo,
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
	if len(uniqueParticipants) != 2 {
		return nil, ErrChatInvalidParticipants
	}

	if err := s.validateAssignmentRecordForParticipants(ctx, uniqueParticipants); err != nil {
		return nil, err
	}

	existing, err := s.conversationRepo.FindByParticipants(ctx, uniqueParticipants)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return mapConversationToDTO(existing), nil
	}

	conversation := &chatDomain.Conversation{
		Participants: buildParticipants(uniqueParticipants),
	}

	inserted, err := s.conversationRepo.Create(ctx, conversation)
	if err != nil {
		return nil, err
	}

	return mapConversationToDTO(inserted), nil
}

func (s *chatService) FindConversationByParticipants(ctx context.Context, participantIDs []primitive.ObjectID) (*dto.ConversationResponse, error) {
	uniqueParticipants := uniqueObjectIDs(participantIDs)
	if len(uniqueParticipants) < 2 {
		return nil, ErrChatInvalidParticipants
	}
	if len(uniqueParticipants) != 2 {
		return nil, ErrChatInvalidParticipants
	}

	existing, err := s.conversationRepo.FindByParticipants(ctx, uniqueParticipants)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, nil
	}

	return mapConversationToDTO(existing), nil
}

func (s *chatService) validateAssignmentRecordForParticipants(ctx context.Context, participantIDs []primitive.ObjectID) error {
	firstID := participantIDs[0]
	secondID := participantIDs[1]

	hasRecord, err := s.assignmentRepo.HasAssignmentRecordForPair(ctx, firstID, secondID)
	if err != nil {
		return err
	}
	if hasRecord {
		return nil
	}

	return ErrChatAssignmentMismatch
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

	conversations, err := s.conversationRepo.FindWithFilter(ctx, chatRepository.ConversationFilter{
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
	if hasMore {
		conversations = conversations[:limit]
		nextCursor = conversations[len(conversations)-1].UpdatedAt.UTC().Format(time.RFC3339Nano)
	}

	// Batch fetch latest message for each conversation using latestMessageId
	latestMessageMap := make(map[primitive.ObjectID]*chatDomain.Message)
	var missingConvIDs []primitive.ObjectID

	for _, conv := range conversations {
		if conv.LatestMessageID != nil && !conv.LatestMessageID.IsZero() {
			// Will fetch by ID below
		} else {
			missingConvIDs = append(missingConvIDs, conv.ID)
		}
	}

	// Collect all latestMessageIDs to batch fetch
	latestMsgIDs := make([]primitive.ObjectID, 0, len(conversations))
	for _, conv := range conversations {
		if conv.LatestMessageID != nil && !conv.LatestMessageID.IsZero() {
			latestMsgIDs = append(latestMsgIDs, *conv.LatestMessageID)
		}
	}

	if len(latestMsgIDs) > 0 {
		msgs, err := s.messageRepo.FindByIDs(ctx, latestMsgIDs)
		if err != nil {
			log.Printf("warn: failed to batch fetch latest messages: %v", err)
		} else {
			for _, msg := range msgs {
				latestMessageMap[msg.ConversationID] = msg
			}
		}
	}

	// For conversations without latestMessageId, fetch individually (fallback)
	for _, convID := range missingConvIDs {
		msg, err := s.messageRepo.FindLatestByConversationID(ctx, convID)
		if err != nil {
			log.Printf("warn: failed to fetch latest message for conversation %s: %v", convID.Hex(), err)
			continue
		}
		if msg != nil {
			latestMessageMap[convID] = msg
		}
	}

	// Build response with lastMessage embedded
	convDTOs := make([]dto.ConversationResponse, 0, len(conversations))
	for _, conv := range conversations {
		mapped := mapConversationToDTO(conv)
		if mapped == nil {
			continue
		}
		if msg, ok := latestMessageMap[conv.ID]; ok {
			msgDTO := mapMessageToDTO(msg)
			mapped.LastMessage = msgDTO
		}
		convDTOs = append(convDTOs, *mapped)
	}

	return &dto.GetConversationsResponse{
		Conversations: convDTOs,
		Paging: dto.Paging{
			HasMore:    hasMore,
			NextCursor: nextCursor,
		},
	}, nil
}

func (s *chatService) SendMessage(ctx context.Context, input *usecase.SendMessageInput) (*dto.MessageResponse, error) {
	if input == nil || input.ConversationID.IsZero() || strings.TrimSpace(input.Content) == "" {
		return nil, ErrChatInvalidMessage
	}

	if input.MessageSource == "" {
		input.MessageSource = chatDomain.UserMessage
	}
	if input.MessageSource != chatDomain.UserMessage && input.MessageSource != chatDomain.SystemMessage {
		return nil, ErrChatInvalidMessage
	}

	conversation, err := s.conversationRepo.FindByID(ctx, input.ConversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, ErrChatConversationMissing
	}

	if input.MessageSource == chatDomain.UserMessage {
		if input.SenderID == nil || input.SenderID.IsZero() {
			return nil, ErrChatInvalidMessage
		}
		if !containsParticipant(conversation.Participants, *input.SenderID) {
			return nil, ErrChatForbidden
		}
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
		MessageSource:    input.MessageSource,
		SenderID:         input.SenderID,
		Content:          strings.TrimSpace(input.Content),
		ReplyToMessageID: input.ReplyToMessageID,
		RelatedAlertID:   input.RelatedAlertID,
	}

	created, err := s.messageRepo.Create(ctx, message)
	if err != nil {
		return nil, err
	}

	if err := s.conversationRepo.SetLatestMessage(ctx, input.ConversationID, created.ID); err != nil {
		log.Printf("warn: failed to set conversation latestMessageId: %v", err)
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
	if !containsParticipant(conversation.Participants, input.RequesterID) {
		return nil, ErrChatForbidden
	}

	limit := input.Limit

	messages, err := s.messageRepo.FindWithFilter(ctx, chatRepository.MessageFilter{
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
	if !containsParticipant(conversation.Participants, input.UserID) {
		return ErrChatForbidden
	}
	return nil
}

func (s *chatService) UpdateParticipantState(ctx context.Context, input *usecase.UpdateParticipantStateInput) error {
	if input == nil || input.ConversationID.IsZero() || input.UserID.IsZero() {
		return ErrChatInvalidParticipants
	}

	if input.LastDeliveredMessageID == nil && input.LastReadMessageID == nil {
		return ErrChatInvalidMessage
	}

	if err := s.ValidateParticipant(ctx, &usecase.ValidateParticipantInput{
		ConversationID: input.ConversationID,
		UserID:         input.UserID,
	}); err != nil {
		return err
	}

	return s.conversationRepo.UpdateParticipantState(
		ctx,
		input.ConversationID,
		input.UserID,
		input.LastDeliveredMessageID,
		input.LastReadMessageID,
	)
}

func buildParticipants(ids []primitive.ObjectID) []chatDomain.Participant {
	participants := make([]chatDomain.Participant, 0, len(ids))
	for _, id := range ids {
		participants = append(participants, chatDomain.Participant{UserID: id})
	}

	return participants
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

func containsParticipant(participants []chatDomain.Participant, target primitive.ObjectID) bool {
	for _, participant := range participants {
		if participant.UserID == target {
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
		ID:              c.ID,
		Participants:    mapParticipantsToDTO(c.Participants),
		LatestMessageID: c.LatestMessageID,
		CreatedAt:       c.CreatedAt,
		UpdatedAt:       c.UpdatedAt,
	}
}

func mapParticipantsToDTO(participants []chatDomain.Participant) []dto.ConversationParticipantResponse {
	results := make([]dto.ConversationParticipantResponse, 0, len(participants))
	for _, participant := range participants {
		results = append(results, dto.ConversationParticipantResponse{
			UserID:                 participant.UserID,
			LastReadMessageID:      participant.LastReadMessageID,
			LastDeliveredMessageID: participant.LastDeliveredMessageID,
		})
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
		MessageSource:    m.MessageSource,
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
