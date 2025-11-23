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

type measurementRepository struct {
	col *mongo.Collection
}

type MeasurementRepository interface {
	Create(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error)
	Update(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error)
	Find(ctx context.Context, f MeasurementFilter) ([]domain.Measurement, error)
}

type MeasurementFilter struct {
	PatientID string
	Type      string
	Timing    string
	IsLatest  bool
}

func NewMeasurementRepository(db *mongo.Database) MeasurementRepository {
	return &measurementRepository{
		col: db.Collection("measurements"),
	}
}

func (r *measurementRepository) Create(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error) {
	now := time.Now().UTC()
	m.CreatedAt = now
	m.UpdatedAt = now

	result, err := r.col.InsertOne(ctx, m)
	if err != nil {
		return nil, err
	}

	m.ID = result.InsertedID.(primitive.ObjectID)
	return m, nil
}

func (r *measurementRepository) Update(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error) {
	update := bson.M{
		"type":      m.Type,
		"systolic":  m.Systolic,
		"diastolic": m.Diastolic,
		"pulse":     m.Pulse,
		"glucose":   m.Glucose,
		"timing":    m.Timing,
		"unit":      m.Unit,
		"device":    m.Device,
		"note":      m.Note,
		"updatedAt": m.UpdatedAt,
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updated domain.Measurement
	err := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": m.ID},
		bson.M{"$set": update},
		opts,
	).Decode(&updated)

	if err != nil {
		return nil, err
	}

	return &updated, nil
}

func (r *measurementRepository) Find(ctx context.Context, f MeasurementFilter) ([]domain.Measurement, error) {

	filter := bson.M{}

	if f.PatientID != "" {
		pid, err := primitive.ObjectIDFromHex(f.PatientID)
		if err == nil {
			filter["patientId"] = pid
		}
	}

	if f.Type != "" {
		filter["type"] = f.Type
	}

	if f.Timing != "" {
		filter["timing"] = f.Timing
	}

	if f.IsLatest {
		opts := options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})
		var result domain.Measurement

		err := r.col.FindOne(ctx, filter, opts).Decode(&result)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return []domain.Measurement{}, nil
			}
			return nil, err
		}

		return []domain.Measurement{result}, nil
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []domain.Measurement
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}
