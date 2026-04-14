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

type userNotificationRepository struct {
	col *mongo.Collection
}

type UserNotificationFilter struct {
	UnreadOnly bool
	Limit      int
	Offset     int
}

type UserNotificationRepository interface {
	CreateOrGetByDedupKey(ctx context.Context, notification *domain.UserNotification) (*domain.UserNotification, bool, error)
	UpdateDelivery(ctx context.Context, id primitive.ObjectID, status domain.NotificationDeliveryStatus, deliveredAt *time.Time, deliveryError *string) (*domain.UserNotification, error)
	FindByUserID(ctx context.Context, userID primitive.ObjectID, filter UserNotificationFilter) ([]domain.UserNotification, error)
	MarkAsReadByID(ctx context.Context, userID primitive.ObjectID, id primitive.ObjectID) (*domain.UserNotification, error)
	CountUnreadByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error)
}

func NewUserNotificationRepository(db *mongo.Database) UserNotificationRepository {
	repo := &userNotificationRepository{col: db.Collection("notifications")}
	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure notification indexes: %v", err)
	}
	return repo
}

func (r *userNotificationRepository) ensureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "userId", Value: 1}, {Key: "dedupKey", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("ux_notification_user_dedup"),
		},
		{
			Keys:    bson.D{{Key: "userId", Value: 1}, {Key: "readAt", Value: 1}, {Key: "createdAt", Value: -1}},
			Options: options.Index().SetName("idx_notification_user_read_created"),
		},
	}
	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
}

func (r *userNotificationRepository) CreateOrGetByDedupKey(ctx context.Context, notification *domain.UserNotification) (*domain.UserNotification, bool, error) {
	now := time.Now().UTC()
	notification.CreatedAt = now
	notification.UpdatedAt = now
	if notification.DeliveryStatus == "" {
		notification.DeliveryStatus = domain.NotificationDeliveryPending
	}

	filter := bson.M{"userId": notification.UserID, "dedupKey": notification.DedupKey}
	update := bson.M{
		"$setOnInsert": bson.M{
			"userId":         notification.UserID,
			"type":           notification.Type,
			"title":          notification.Title,
			"body":           notification.Body,
			"data":           notification.Data,
			"dedupKey":       notification.DedupKey,
			"deliveryStatus": notification.DeliveryStatus,
			"createdAt":      notification.CreatedAt,
			"updatedAt":      notification.UpdatedAt,
		},
	}

	result, err := r.col.UpdateOne(ctx, filter, update, options.Update().SetUpsert(true))
	if err != nil {
		return nil, false, err
	}

	var doc domain.UserNotification
	if err := r.col.FindOne(ctx, filter).Decode(&doc); err != nil {
		return nil, false, err
	}

	return &doc, result.UpsertedCount > 0, nil
}

func (r *userNotificationRepository) UpdateDelivery(ctx context.Context, id primitive.ObjectID, status domain.NotificationDeliveryStatus, deliveredAt *time.Time, deliveryError *string) (*domain.UserNotification, error) {
	now := time.Now().UTC()
	setFields := bson.M{
		"deliveryStatus": status,
		"updatedAt":      now,
	}
	unsetFields := bson.M{}

	if deliveredAt != nil {
		setFields["deliveredAt"] = *deliveredAt
	} else {
		unsetFields["deliveredAt"] = ""
	}

	if deliveryError != nil && *deliveryError != "" {
		setFields["deliveryError"] = *deliveryError
	} else {
		unsetFields["deliveryError"] = ""
	}

	update := bson.M{"$set": setFields}
	if len(unsetFields) > 0 {
		update["$unset"] = unsetFields
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated domain.UserNotification
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, update, opts).Decode(&updated); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &updated, nil
}

func (r *userNotificationRepository) FindByUserID(ctx context.Context, userID primitive.ObjectID, filter UserNotificationFilter) ([]domain.UserNotification, error) {
	bsonFilter := bson.M{"userId": userID}
	if filter.UnreadOnly {
		bsonFilter["readAt"] = bson.M{"$exists": false}
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	if filter.Offset > 0 {
		opts.SetSkip(int64(filter.Offset))
	}
	if filter.Limit > 0 {
		opts.SetLimit(int64(filter.Limit))
	}

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []domain.UserNotification
	if err := cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}
	return notifications, nil
}

func (r *userNotificationRepository) MarkAsReadByID(ctx context.Context, userID primitive.ObjectID, id primitive.ObjectID) (*domain.UserNotification, error) {
	now := time.Now().UTC()
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated domain.UserNotification
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": id, "userId": userID},
		bson.M{"$set": bson.M{"readAt": now, "updatedAt": now}},
		opts,
	).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &updated, nil
}

func (r *userNotificationRepository) CountUnreadByUserID(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	return r.col.CountDocuments(ctx, bson.M{"userId": userID, "readAt": bson.M{"$exists": false}})
}
