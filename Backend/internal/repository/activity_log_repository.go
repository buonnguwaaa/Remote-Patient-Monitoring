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

type ActivityLogRepository struct {
	collection *mongo.Collection
}

func NewActivityLogRepository(db *mongo.Database) *ActivityLogRepository {
	repo := &ActivityLogRepository{
		collection: db.Collection("activity_logs"),
	}
	if err := repo.EnsureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure activity log indexes: %v", err)
	}
	return repo
}

func (r *ActivityLogRepository) EnsureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "createdAt", Value: -1}},
			Options: options.Index().SetName("idx_activity_log_created"),
		},
		{
			Keys: bson.D{
				{Key: "userId", Value: 1},
				{Key: "createdAt", Value: -1},
			},
			Options: options.Index().SetName("idx_activity_log_user_created"),
		},
		{
			Keys: bson.D{
				{Key: "type", Value: 1},
				{Key: "createdAt", Value: -1},
			},
			Options: options.Index().SetName("idx_activity_log_type_created"),
		},
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "createdAt", Value: -1},
			},
			Options: options.Index().SetName("idx_activity_log_patient_created").SetSparse(true),
		},
	}
	_, err := r.collection.Indexes().CreateMany(ctx, models)
	return err
}

// Create creates a new activity log entry
func (r *ActivityLogRepository) Create(ctx context.Context, log *domain.ActivityLog) error {
	if log.ID.IsZero() {
		log.ID = primitive.NewObjectID()
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}

	_, err := r.collection.InsertOne(ctx, log)
	return err
}

// FindByDateRange finds activity logs within a date range
func (r *ActivityLogRepository) FindByDateRange(ctx context.Context, startDate, endDate time.Time, activityType string, limit, skip int) ([]*domain.ActivityLog, error) {
	filter := bson.M{
		"createdAt": bson.M{
			"$gte": startDate,
			"$lte": endDate,
		},
	}

	if activityType != "" && activityType != "all" {
		filter["type"] = activityType
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*domain.ActivityLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}

// CountByDateRange counts activity logs within a date range
func (r *ActivityLogRepository) CountByDateRange(ctx context.Context, startDate, endDate time.Time, activityType string) (int64, error) {
	filter := bson.M{
		"createdAt": bson.M{
			"$gte": startDate,
			"$lte": endDate,
		},
	}

	if activityType != "" && activityType != "all" {
		filter["type"] = activityType
	}

	return r.collection.CountDocuments(ctx, filter)
}

// FindByUserID finds activity logs by actor user ID, optionally limited to resources.
func (r *ActivityLogRepository) FindByUserID(
	ctx context.Context,
	userID primitive.ObjectID,
	resources []string,
	limit, skip int,
) ([]*domain.ActivityLog, error) {
	filter := bson.M{"userId": userID}
	if len(resources) > 0 {
		filter["resource"] = bson.M{"$in": resources}
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*domain.ActivityLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}

// CountByUserID counts activity logs by actor user ID.
func (r *ActivityLogRepository) CountByUserID(
	ctx context.Context,
	userID primitive.ObjectID,
	resources []string,
) (int64, error) {
	filter := bson.M{"userId": userID}
	if len(resources) > 0 {
		filter["resource"] = bson.M{"$in": resources}
	}
	return r.collection.CountDocuments(ctx, filter)
}

// GetStatsByDateRange gets statistics for activity logs within a date range
func (r *ActivityLogRepository) GetStatsByDateRange(ctx context.Context, startDate, endDate time.Time) (map[string]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"createdAt": bson.M{
				"$gte": startDate,
				"$lte": endDate,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$type",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	stats := make(map[string]int64)
	for cursor.Next(ctx) {
		var result struct {
			ID    string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
		stats[result.ID] = result.Count
	}

	return stats, nil
}

// ClinicalResources are write events that belong on a patient clinical chart.
var ClinicalResources = []string{
	"patients",
	"measurements",
	"prescriptions",
	"medication-intakes",
	"alerts",
	"thresholds",
	"reminders",
	"follow-up-appointments",
	"messages",
	"chat",
	"video-sessions",
}

// AccountActivityResources are events a patient may see about their own chart.
var AccountActivityResources = []string{
	"patients",
	"measurements",
	"prescriptions",
	"medication-intakes",
	"alerts",
	"reminders",
	"follow-up-appointments",
}

// FindByPatientID finds activity logs linked to a patient, optionally limited to resources.
func (r *ActivityLogRepository) FindByPatientID(
	ctx context.Context,
	patientID primitive.ObjectID,
	resources []string,
	limit, skip int,
) ([]*domain.ActivityLog, error) {
	filter := bson.M{"patientId": patientID}
	if len(resources) > 0 {
		filter["resource"] = bson.M{"$in": resources}
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(skip))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*domain.ActivityLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// CountByPatientID counts activity logs linked to a patient.
func (r *ActivityLogRepository) CountByPatientID(
	ctx context.Context,
	patientID primitive.ObjectID,
	resources []string,
) (int64, error) {
	filter := bson.M{"patientId": patientID}
	if len(resources) > 0 {
		filter["resource"] = bson.M{"$in": resources}
	}
	return r.collection.CountDocuments(ctx, filter)
}

// DeleteOlderThan deletes activity logs older than the specified duration
func (r *ActivityLogRepository) DeleteOlderThan(ctx context.Context, duration time.Duration) (int64, error) {
	cutoffDate := time.Now().Add(-duration)
	filter := bson.M{
		"createdAt": bson.M{"$lt": cutoffDate},
	}

	result, err := r.collection.DeleteMany(ctx, filter)
	if err != nil {
		return 0, err
	}

	return result.DeletedCount, nil
}

// DeleteAccessLogs deletes all system logs with "Truy cập:" action (GET request logs)
func (r *ActivityLogRepository) DeleteAccessLogs(ctx context.Context) (int64, error) {
	filter := bson.M{
		"type": "system",
		"action": bson.M{
			"$regex": "^Truy cập:",
		},
	}

	result, err := r.collection.DeleteMany(ctx, filter)
	if err != nil {
		return 0, err
	}

	return result.DeletedCount, nil
}

// DeleteByID deletes an activity log by ID
func (r *ActivityLogRepository) DeleteByID(ctx context.Context, id string) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return mongo.ErrNoDocuments
	}

	return nil
}
