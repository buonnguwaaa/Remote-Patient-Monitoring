package repository

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type alertRepository struct {
	col *mongo.Collection
}

type AlertRepository interface {
	Create(ctx context.Context, a *domain.Alert) (*domain.Alert, error)
	FindWithFilter(ctx context.Context, filter AlertFilter) ([]domain.Alert, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Alert, error)
	UpdateAcknowledgementByID(ctx context.Context, id primitive.ObjectID, acknowledgedBy primitive.ObjectID) (*domain.Alert, error)
}

type AlertFilter struct {
	PatientID  string
	PatientIDs []string
	Status     domain.Status
	Severity   domain.Severity
	IsLatest   bool
	// Page      int
	// Limit     int
	// Offset    int
	// SortOrder string
}

func NewAlertRepository(db *mongo.Database) AlertRepository {
	return &alertRepository{
		col: db.Collection("alerts"),
	}
}

func (r *alertRepository) Create(ctx context.Context, a *domain.Alert) (*domain.Alert, error) {
	now := time.Now().UTC()
	a.CreatedAt = now
	a.UpdatedAt = now

	_, err := r.col.InsertOne(ctx, a)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *alertRepository) FindWithFilter(ctx context.Context, filter AlertFilter) ([]domain.Alert, error) {
	bsonFilter := bson.M{}

	if filter.PatientID != "" {
		patientID, err := primitive.ObjectIDFromHex(filter.PatientID)
		if err != nil {
			return nil, err
		}
		bsonFilter["patientId"] = patientID
	} else if len(filter.PatientIDs) > 0 {
		patientIDs := make([]primitive.ObjectID, 0, len(filter.PatientIDs))
		for _, patientIDHex := range filter.PatientIDs {
			patientID, err := primitive.ObjectIDFromHex(patientIDHex)
			if err != nil {
				return nil, err
			}
			patientIDs = append(patientIDs, patientID)
		}
		bsonFilter["patientId"] = bson.M{"$in": patientIDs}
	}

	if filter.Status != "" {
		bsonFilter["status"] = filter.Status
	}

	if filter.Severity != "" {
		bsonFilter["severity"] = filter.Severity
	}

	opts := options.Find()
	if filter.IsLatest {
		opts.SetSort(bson.M{"createdAt": -1})
		opts.SetLimit(1)
	} else {
		opts.SetSort(bson.M{"createdAt": -1})
	}

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var alerts []domain.Alert
	if err = cursor.All(ctx, &alerts); err != nil {
		return nil, err
	}

	return alerts, nil
}

func (r *alertRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Alert, error) {
	filter := bson.M{"_id": id}
	var a domain.Alert
	if err := r.col.FindOne(ctx, filter).Decode(&a); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &a, nil
}

func (r *alertRepository) UpdateAcknowledgementByID(
	ctx context.Context,
	id primitive.ObjectID,
	acknowledgedBy primitive.ObjectID,
) (*domain.Alert, error) {

	now := time.Now().UTC()

	filter := bson.M{"_id": id}

	update := bson.M{
		"$set": bson.M{
			"status":         domain.StatusAck,
			"acknowledgedBy": acknowledgedBy,
			"acknowledgedAt": now,
			"updatedAt":      now,
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedAlert domain.Alert
	err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&updatedAlert)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updatedAlert, nil
}
