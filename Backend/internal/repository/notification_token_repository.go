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

type notificationTokenRepository struct {
	col *mongo.Collection
}

type NotificationTokenRepository interface {
	UpsertByUserAndDevice(ctx context.Context, token *domain.NotificationToken) (*domain.NotificationToken, error)
	FindActiveByUserID(ctx context.Context, userID primitive.ObjectID) ([]domain.NotificationToken, error)
	DeactivateByToken(ctx context.Context, token string) error
	DeactivateByUserAndDevice(ctx context.Context, userID primitive.ObjectID, deviceID string) error
}

func NewNotificationTokenRepository(db *mongo.Database) NotificationTokenRepository {
	repo := &notificationTokenRepository{col: db.Collection("notification_tokens")}

	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure notification token indexes: %v", err)
	}

	return repo
}

func (r *notificationTokenRepository) ensureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "userId", Value: 1}, {Key: "deviceId", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetName("ux_notification_token_user_device"),
		},
		{
			Keys: bson.D{{Key: "userId", Value: 1}, {Key: "isActive", Value: 1}, {Key: "updatedAt", Value: -1}},
			Options: options.Index().
				SetName("idx_notification_token_user_active_updated"),
		},
		{
			Keys:    bson.D{{Key: "token", Value: 1}},
			Options: options.Index().SetName("idx_notification_token_token"),
		},
	}

	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
}

func (r *notificationTokenRepository) UpsertByUserAndDevice(ctx context.Context, token *domain.NotificationToken) (*domain.NotificationToken, error) {
	now := time.Now().UTC()
	filter := bson.M{
		"userId":   token.UserID,
		"deviceId": token.DeviceID,
	}

	update := bson.M{
		"$set": bson.M{
			"platform":   token.Platform,
			"provider":   token.Provider,
			"token":      token.Token,
			"isActive":   true,
			"lastSeenAt": now,
			"updatedAt":  now,
		},
		"$setOnInsert": bson.M{
			"createdAt": now,
			"userId":    token.UserID,
			"deviceId":  token.DeviceID,
		},
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var updated domain.NotificationToken
	if err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&updated); err != nil {
		return nil, err
	}

	conflictFilter := bson.M{
		"_id":      bson.M{"$ne": updated.ID},
		"isActive": true,
		"$or": []bson.M{
			{
				"userId": updated.UserID,
				"token":  updated.Token,
			},
			{
				"deviceId": updated.DeviceID,
				"userId":   bson.M{"$ne": updated.UserID},
			},
			{
				"token":  updated.Token,
				"userId": bson.M{"$ne": updated.UserID},
			},
		},
	}

	_, err := r.col.UpdateMany(
		ctx,
		conflictFilter,
		bson.M{"$set": bson.M{"isActive": false, "updatedAt": now}},
	)
	if err != nil {
		return nil, err
	}

	return &updated, nil
}

func (r *notificationTokenRepository) FindActiveByUserID(ctx context.Context, userID primitive.ObjectID) ([]domain.NotificationToken, error) {
	filter := bson.M{"userId": userID, "isActive": true}
	opts := options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}})

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var tokens []domain.NotificationToken
	if err := cursor.All(ctx, &tokens); err != nil {
		return nil, err
	}

	return tokens, nil
}

func (r *notificationTokenRepository) DeactivateByToken(ctx context.Context, token string) error {
	_, err := r.col.UpdateMany(
		ctx,
		bson.M{"token": token},
		bson.M{"$set": bson.M{"isActive": false, "updatedAt": time.Now().UTC()}},
	)
	return err
}

func (r *notificationTokenRepository) DeactivateByUserAndDevice(ctx context.Context, userID primitive.ObjectID, deviceID string) error {
	_, err := r.col.UpdateMany(
		ctx,
		bson.M{"userId": userID, "deviceId": deviceID, "isActive": true},
		bson.M{"$set": bson.M{"isActive": false, "updatedAt": time.Now().UTC()}},
	)
	return err
}
