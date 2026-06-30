package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/realtime"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Video session service errors.
var (
	ErrVideoSessionNotFound      = errors.New("video: session not found")
	ErrVideoSessionForbidden     = errors.New("video: user is not a participant of this session")
	ErrVideoSessionNotDoctor     = errors.New("video: only doctor can create a video session")
	ErrVideoSessionNotAssigned   = errors.New("video: doctor is not assigned to this patient")
	ErrVideoSessionAlreadyActive = errors.New("video: an active or pending session already exists for this conversation")
	ErrVideoSessionExpired       = errors.New("video: session has expired")
	ErrVideoSessionBadStatus     = errors.New("video: operation not allowed in current session status")
)

// VideoSessionService manages the full lifecycle of video call sessions.
type VideoSessionService interface {
	CreateVideoSession(ctx context.Context, callerID primitive.ObjectID, role userDomain.Role, req *dto.CreateVideoSessionRequest) (*dto.VideoSessionResponse, error)
	// JoinVideoSession validates permission and returns the joinUrl.
	JoinVideoSession(ctx context.Context, callerID primitive.ObjectID, role userDomain.Role, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error)
	EndVideoSession(ctx context.Context, callerID primitive.ObjectID, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error)
	RejectVideoSession(ctx context.Context, callerID primitive.ObjectID, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error)
	GetVideoSession(ctx context.Context, callerID primitive.ObjectID, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error)
	GetActiveVideoSession(ctx context.Context, callerID primitive.ObjectID, conversationID *primitive.ObjectID, patientID *primitive.ObjectID) (*dto.VideoSessionResponse, error)
}

type videoSessionService struct {
	videoRepo         repository.VideoSessionRepository
	assignmentRepo    repository.AssignmentRepository
	chatService       ChatService
	realtimePublisher *realtime.RedisUserEventPublisher
}

// NewVideoSessionService creates the video session service.
// realtimePublisher may be nil — in that case realtime events are skipped (logged as warning).
func NewVideoSessionService(
	videoRepo repository.VideoSessionRepository,
	assignmentRepo repository.AssignmentRepository,
	chatService ChatService,
	realtimePublisher *realtime.RedisUserEventPublisher,
) VideoSessionService {
	return &videoSessionService{
		videoRepo:         videoRepo,
		assignmentRepo:    assignmentRepo,
		chatService:       chatService,
		realtimePublisher: realtimePublisher,
	}
}

// jitsiConfig reads Jitsi configuration from environment variables.
func jitsiConfig() (domain, prefix string, ttlMinutes int) {
	domain = os.Getenv("JITSI_DOMAIN")
	if domain == "" {
		domain = "meet.jit.si"
	}
	prefix = os.Getenv("JITSI_ROOM_PREFIX")
	if prefix == "" {
		prefix = "rpm"
	}
	ttlStr := os.Getenv("VIDEO_SESSION_TTL_MINUTES")
	ttlMinutes, _ = strconv.Atoi(ttlStr)
	if ttlMinutes <= 0 {
		ttlMinutes = 60
	}
	return
}

// buildJoinURL constructs the Jitsi meeting URL from a room name.
func buildJoinURL(roomName string) string {
	jitsiDomain, _, _ := jitsiConfig()
	configHash := "#config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.SHOW_BRAND_WATERMARK=false"
	return fmt.Sprintf("https://%s/%s%s", jitsiDomain, roomName, configHash)
}

// generateRoomName creates a random, PII-free room identifier.
// Format: {prefix}_{convIdShort6}_{randomToken12}
func generateRoomName(conversationID primitive.ObjectID) (string, error) {
	_, prefix, _ := jitsiConfig()
	convShort := conversationID.Hex()[:6]

	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	token := hex.EncodeToString(buf) // 12 hex chars

	return fmt.Sprintf("%s_%s_%s", prefix, convShort, token), nil
}

// isParticipant checks if callerID is doctor or patient of a session.
func isSessionParticipant(session *domain.VideoSession, callerID primitive.ObjectID) bool {
	return session.DoctorID == callerID || session.PatientID == callerID
}

// mapToDTO converts a domain VideoSession to DTO. joinURL is only populated when withJoinURL=true.
func mapVideoSessionToDTO(s *domain.VideoSession, withJoinURL bool) *dto.VideoSessionResponse {
	resp := &dto.VideoSessionResponse{
		ID:             s.ID,
		ConversationID: s.ConversationID,
		DoctorID:       s.DoctorID,
		PatientID:      s.PatientID,
		Provider:       s.Provider,
		RoomName:       s.RoomName,
		Status:         string(s.Status),
		StartedAt:      s.StartedAt,
		EndedAt:        s.EndedAt,
		ExpiresAt:      s.ExpiresAt,
		CreatedAt:      s.CreatedAt,
		UpdatedAt:      s.UpdatedAt,
	}
	if withJoinURL {
		resp.JoinURL = buildJoinURL(s.RoomName)
	}
	return resp
}

// ─── CreateVideoSession ────────────────────────────────────────────────────

func (s *videoSessionService) CreateVideoSession(ctx context.Context, callerID primitive.ObjectID, role userDomain.Role, req *dto.CreateVideoSessionRequest) (*dto.VideoSessionResponse, error) {
	// Only doctors can create sessions.
	if role != userDomain.RoleDoctor {
		return nil, ErrVideoSessionNotDoctor
	}

	patientID := req.PatientID

	// Validate assignment: doctor must be assigned to this patient.
	hasAssignment, err := s.assignmentRepo.HasAssignmentRecordForPair(ctx, callerID, patientID)
	if err != nil {
		return nil, fmt.Errorf("video: failed to check assignment: %w", err)
	}
	if !hasAssignment {
		return nil, ErrVideoSessionNotAssigned
	}

	// Find or create conversation.
	var conversationID primitive.ObjectID
	if req.ConversationID != nil && !req.ConversationID.IsZero() {
		conversationID = *req.ConversationID
	} else {
		conv, err := s.chatService.CreateConversation(ctx, &usecase.CreateConversationInput{
			ParticipantIDs: []primitive.ObjectID{callerID, patientID},
		})
		if err != nil {
			return nil, fmt.Errorf("video: failed to ensure conversation: %w", err)
		}
		convID, err := primitive.ObjectIDFromHex(conv.ID.Hex())
		if err != nil {
			return nil, fmt.Errorf("video: invalid conversation id: %w", err)
		}
		conversationID = convID
	}

	// Reject if an active/pending session already exists for this conversation.
	existing, err := s.videoRepo.FindActiveByConversation(ctx, conversationID)
	if err != nil {
		return nil, fmt.Errorf("video: failed to check existing sessions: %w", err)
	}
	if existing != nil {
		return nil, ErrVideoSessionAlreadyActive
	}

	// Generate room name.
	roomName, err := generateRoomName(conversationID)
	if err != nil {
		return nil, err
	}

	_, _, ttlMinutes := jitsiConfig()
	now := time.Now()
	session := &domain.VideoSession{
		ConversationID: conversationID,
		DoctorID:       callerID,
		PatientID:      patientID,
		CreatedBy:      callerID,
		Provider:       "jitsi",
		RoomName:       roomName,
		Status:         domain.VideoSessionPending,
		ExpiresAt:      now.Add(time.Duration(ttlMinutes) * time.Minute),
	}

	created, err := s.videoRepo.Create(ctx, session)
	if err != nil {
		return nil, fmt.Errorf("video: failed to create session: %w", err)
	}

	// Send system chat message — contains videoSessionId and conversationId but NOT joinUrl.
	// MVP workaround: embed structured JSON in message content since Message domain
	// does not yet have a metadata field. Frontend must detect messageSource=system
	// and parse this JSON to render the invite card.
	invitePayload := map[string]string{
		"type":           "video_call_invite",
		"videoSessionId": created.ID.Hex(),
		"conversationId": conversationID.Hex(),
	}
	inviteJSON, _ := json.Marshal(invitePayload)
	_, err = s.chatService.SendMessage(ctx, &usecase.SendMessageInput{
		ConversationID: conversationID,
		MessageSource:  chatDomain.SystemMessage,
		SenderID:       &callerID,
		Content:        string(inviteJSON),
	})
	if err != nil {
		// Non-fatal: session is created, just log the warning.
		log.Printf("[WARN] video: failed to send invite system message: %v", err)
	}

	// Publish realtime event to patient so they receive the invite even if not on chat page.
	s.publishInviteEvent(ctx, created)

	return mapVideoSessionToDTO(created, false), nil
}

func (s *videoSessionService) publishInviteEvent(ctx context.Context, session *domain.VideoSession) {
	if s.realtimePublisher == nil {
		return
	}
	event := realtime.BuildVideoCallInviteEvent(
		session.ID.Hex(),
		session.ConversationID.Hex(),
		session.DoctorID.Hex(),
		session.PatientID.Hex(),
	)
	// Publish to patient's userID channel.
	if err := s.realtimePublisher.Publish(ctx, session.PatientID.Hex(), event); err != nil {
		log.Printf("[WARN] video: failed to publish invite realtime event to patient %s: %v", session.PatientID.Hex(), err)
	}
}

// ─── JoinVideoSession ─────────────────────────────────────────────────────

func (s *videoSessionService) JoinVideoSession(ctx context.Context, callerID primitive.ObjectID, role userDomain.Role, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error) {
	session, err := s.videoRepo.FindByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("video: db error: %w", err)
	}
	if session == nil {
		return nil, ErrVideoSessionNotFound
	}
	if !isSessionParticipant(session, callerID) {
		return nil, ErrVideoSessionForbidden
	}
	if time.Now().After(session.ExpiresAt) {
		// Mark as expired.
		_ = s.videoRepo.UpdateStatus(ctx, sessionID, domain.VideoSessionExpired, nil, nil)
		return nil, ErrVideoSessionExpired
	}
	if session.Status == domain.VideoSessionEnded || session.Status == domain.VideoSessionRejected || session.Status == domain.VideoSessionExpired {
		return nil, ErrVideoSessionBadStatus
	}

	// Transition pending → active on first join.
	if session.Status == domain.VideoSessionPending {
		now := time.Now()
		if err := s.videoRepo.UpdateStatus(ctx, sessionID, domain.VideoSessionActive, &now, nil); err != nil {
			return nil, fmt.Errorf("video: failed to activate session: %w", err)
		}
		session.Status = domain.VideoSessionActive
		session.StartedAt = &now
	}

	// Return response WITH joinUrl — only given to authorized participants.
	return mapVideoSessionToDTO(session, true), nil
}

// ─── EndVideoSession ──────────────────────────────────────────────────────

func (s *videoSessionService) EndVideoSession(ctx context.Context, callerID primitive.ObjectID, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error) {
	session, err := s.videoRepo.FindByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("video: db error: %w", err)
	}
	if session == nil {
		return nil, ErrVideoSessionNotFound
	}
	if !isSessionParticipant(session, callerID) {
		return nil, ErrVideoSessionForbidden
	}
	if session.Status == domain.VideoSessionEnded {
		return mapVideoSessionToDTO(session, false), nil // idempotent
	}
	if session.Status == domain.VideoSessionRejected || session.Status == domain.VideoSessionExpired {
		return nil, ErrVideoSessionBadStatus
	}

	now := time.Now()
	if err := s.videoRepo.UpdateStatus(ctx, sessionID, domain.VideoSessionEnded, nil, &now); err != nil {
		return nil, fmt.Errorf("video: failed to end session: %w", err)
	}
	session.Status = domain.VideoSessionEnded
	session.EndedAt = &now

	// Send system message notifying call ended.
	endedPayload := map[string]string{
		"type":           "video_call_ended",
		"videoSessionId": session.ID.Hex(),
		"conversationId": session.ConversationID.Hex(),
	}
	endedJSON, _ := json.Marshal(endedPayload)
	_, _ = s.chatService.SendMessage(ctx, &usecase.SendMessageInput{
		ConversationID: session.ConversationID,
		MessageSource:  chatDomain.SystemMessage,
		SenderID:       &callerID,
		Content:        string(endedJSON),
	})

	// Publish realtime ended event to the other participant.
	if s.realtimePublisher != nil {
		otherID := session.PatientID
		if callerID == session.PatientID {
			otherID = session.DoctorID
		}
		event := realtime.BuildVideoCallEndedEvent(session.ID.Hex(), session.ConversationID.Hex(), otherID.Hex())
		if err := s.realtimePublisher.Publish(ctx, otherID.Hex(), event); err != nil {
			log.Printf("[WARN] video: failed to publish ended event: %v", err)
		}
	}

	return mapVideoSessionToDTO(session, false), nil
}

// ─── RejectVideoSession ───────────────────────────────────────────────────

func (s *videoSessionService) RejectVideoSession(ctx context.Context, callerID primitive.ObjectID, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error) {
	session, err := s.videoRepo.FindByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("video: db error: %w", err)
	}
	if session == nil {
		return nil, ErrVideoSessionNotFound
	}
	if !isSessionParticipant(session, callerID) {
		return nil, ErrVideoSessionForbidden
	}
	if session.Status != domain.VideoSessionPending {
		return nil, ErrVideoSessionBadStatus
	}

	if err := s.videoRepo.UpdateStatus(ctx, sessionID, domain.VideoSessionRejected, nil, nil); err != nil {
		return nil, fmt.Errorf("video: failed to reject session: %w", err)
	}
	session.Status = domain.VideoSessionRejected
	return mapVideoSessionToDTO(session, false), nil
}

// ─── GetVideoSession ──────────────────────────────────────────────────────

func (s *videoSessionService) GetVideoSession(ctx context.Context, callerID primitive.ObjectID, sessionID primitive.ObjectID) (*dto.VideoSessionResponse, error) {
	session, err := s.videoRepo.FindByID(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("video: db error: %w", err)
	}
	if session == nil {
		return nil, ErrVideoSessionNotFound
	}
	if !isSessionParticipant(session, callerID) {
		return nil, ErrVideoSessionForbidden
	}
	return mapVideoSessionToDTO(session, false), nil
}

// ─── GetActiveVideoSession ────────────────────────────────────────────────

func (s *videoSessionService) GetActiveVideoSession(ctx context.Context, callerID primitive.ObjectID, conversationID *primitive.ObjectID, patientID *primitive.ObjectID) (*dto.VideoSessionResponse, error) {
	var session *domain.VideoSession
	var err error

	if conversationID != nil && !conversationID.IsZero() {
		session, err = s.videoRepo.FindActiveByConversation(ctx, *conversationID)
	} else if patientID != nil && !patientID.IsZero() {
		session, err = s.videoRepo.FindActiveByPatient(ctx, *patientID)
	} else {
		return nil, fmt.Errorf("video: conversationId or patientId is required")
	}
	if err != nil {
		return nil, fmt.Errorf("video: db error: %w", err)
	}
	if session == nil {
		return nil, nil
	}
	if !isSessionParticipant(session, callerID) {
		return nil, ErrVideoSessionForbidden
	}
	return mapVideoSessionToDTO(session, false), nil
}
