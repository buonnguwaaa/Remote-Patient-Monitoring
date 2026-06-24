package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// VideoSessionRepository manages persistence for video call sessions.
type VideoSessionRepository interface {
	Create(ctx context.Context, session *domain.VideoSession) (*domain.VideoSession, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.VideoSession, error)
	// FindActiveByConversation returns a session in pending or active state for the conversation
	// that has not yet expired.
	FindActiveByConversation(ctx context.Context, conversationID primitive.ObjectID) (*domain.VideoSession, error)
	// FindActiveByPatient returns a pending/active non-expired session for a patient.
	FindActiveByPatient(ctx context.Context, patientID primitive.ObjectID) (*domain.VideoSession, error)
	// UpdateStatus updates the session status and optional time fields.
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status domain.VideoSessionStatus, startedAt *time.Time, endedAt *time.Time) error
	// MarkExpiredSessions sets status=expired for sessions that are past ExpiresAt.
	MarkExpiredSessions(ctx context.Context) error
}

type videoSessionRepository struct {
	collection *mongo.Collection
}

// NewVideoSessionRepository creates the repository and ensures indexes.
func NewVideoSessionRepository(db *mongo.Database) VideoSessionRepository {
	repo := &videoSessionRepository{
		collection: db.Collection("video_sessions"),
	}
	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure video_session indexes: %v", err)
	}
	return repo
}

func (r *videoSessionRepository) ensureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "conversationId", Value: 1}, {Key: "status", Value: 1}},
			Options: options.Index().SetName("idx_vs_conv_status"),
		},
		{
			Keys:    bson.D{{Key: "patientId", Value: 1}, {Key: "status", Value: 1}},
			Options: options.Index().SetName("idx_vs_patient_status"),
		},
		{
			Keys:    bson.D{{Key: "expiresAt", Value: 1}},
			Options: options.Index().SetName("idx_vs_expires_at"),
		},
		{
			Keys:    bson.D{{Key: "createdAt", Value: -1}},
			Options: options.Index().SetName("idx_vs_created_at"),
		},
	})
	return err
}

func (r *videoSessionRepository) Create(ctx context.Context, session *domain.VideoSession) (*domain.VideoSession, error) {
	session.ID = primitive.NewObjectID()
	now := time.Now()
	session.CreatedAt = now
	session.UpdatedAt = now
	_, err := r.collection.InsertOne(ctx, session)
	if err != nil {
		return nil, err
	}
	return session, nil
}

func (r *videoSessionRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.VideoSession, error) {
	var session domain.VideoSession
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&session)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// activeStatuses are statuses that block duplicate session creation.
var activeStatuses = bson.A{
	string(domain.VideoSessionPending),
	string(domain.VideoSessionActive),
}

func (r *videoSessionRepository) FindActiveByConversation(ctx context.Context, conversationID primitive.ObjectID) (*domain.VideoSession, error) {
	filter := bson.M{
		"conversationId": conversationID,
		"status":         bson.M{"$in": activeStatuses},
		"expiresAt":      bson.M{"$gt": time.Now()},
	}
	var session domain.VideoSession
	err := r.collection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})).Decode(&session)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *videoSessionRepository) FindActiveByPatient(ctx context.Context, patientID primitive.ObjectID) (*domain.VideoSession, error) {
	filter := bson.M{
		"patientId": patientID,
		"status":    bson.M{"$in": activeStatuses},
		"expiresAt": bson.M{"$gt": time.Now()},
	}
	var session domain.VideoSession
	err := r.collection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})).Decode(&session)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *videoSessionRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status domain.VideoSessionStatus, startedAt *time.Time, endedAt *time.Time) error {
	update := bson.M{
		"$set": bson.M{
			"status":    status,
			"updatedAt": time.Now(),
		},
	}
	set := update["$set"].(bson.M)
	if startedAt != nil {
		set["startedAt"] = startedAt
	}
	if endedAt != nil {
		set["endedAt"] = endedAt
	}
	_, err := r.collection.UpdateByID(ctx, id, update)
	return err
}

func (r *videoSessionRepository) MarkExpiredSessions(ctx context.Context) error {
	filter := bson.M{
		"status":    bson.M{"$in": activeStatuses},
		"expiresAt": bson.M{"$lte": time.Now()},
	}
	_, err := r.collection.UpdateMany(ctx, filter, bson.M{
		"$set": bson.M{
			"status":    domain.VideoSessionExpired,
			"updatedAt": time.Now(),
		},
	})
	return err
}
