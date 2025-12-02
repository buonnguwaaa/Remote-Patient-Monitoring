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

type thresholdRepository struct {
	col *mongo.Collection
}

type ThresholdRepository interface {
	Create(ctx context.Context, t *domain.Threshold) (*domain.Threshold, error)
	Find(ctx context.Context, filter ThresholdFilter) ([]domain.Threshold, error)
	Update(ctx context.Context, t *domain.Threshold) (*domain.Threshold, error)
}

type ThresholdFilter struct {
	PatientID string
	DoctorID  string
	IsLatest  bool
}

func NewThresholdRepository(db *mongo.Database) ThresholdRepository {
	return &thresholdRepository{
		col: db.Collection("thresholds"),
	}
}

func (r *thresholdRepository) Create(ctx context.Context, t *domain.Threshold) (*domain.Threshold, error) {
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now

	result, err := r.col.InsertOne(ctx, t)
	if err != nil {
		return nil, err
	}

	t.ID = result.InsertedID.(primitive.ObjectID)
	return t, nil
}

func (r *thresholdRepository) Find(ctx context.Context, filter ThresholdFilter) ([]domain.Threshold, error) {
	query := bson.M{}

	if filter.PatientID != "" {
		pid, err := primitive.ObjectIDFromHex(filter.PatientID)
		if err == nil {
			query["patientId"] = pid
		}
	}

	if filter.DoctorID != "" {
		did, err := primitive.ObjectIDFromHex(filter.DoctorID)
		if err == nil {
			query["doctorId"] = did
		}
	}

	// --- CASE: GET LATEST RECORD ONLY ---
	if filter.IsLatest {
		opts := options.FindOne().
			SetSort(bson.D{{Key: "effectiveFrom", Value: -1}})

		var result domain.Threshold
		err := r.col.FindOne(ctx, query, opts).Decode(&result)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return []domain.Threshold{}, nil
			}
			return nil, err
		}

		return []domain.Threshold{result}, nil
	}

	// --- GET MULTIPLE ---
	opts := options.Find().
		SetSort(bson.D{{Key: "effectiveFrom", Value: -1}})

	cursor, err := r.col.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []domain.Threshold
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	return results, nil
}

func (r *thresholdRepository) Update(ctx context.Context, t *domain.Threshold) (*domain.Threshold, error) {
	update := bson.M{
		"$set": bson.M{
			"temperatureMin":     t.TemperatureMin,
			"temperatureMax":     t.TemperatureMax,
			"heartRateMin":       t.HeartRateMin,
			"heartRateMax":       t.HeartRateMax,
			"respiratoryRateMin": t.RespiratoryRateMin,
			"respiratoryRateMax": t.RespiratoryRateMax,
			"spo2Min":            t.SpO2Min,
			"sysMin":             t.SysMin,
			"sysMax":             t.SysMax,
			"diaMin":             t.DiaMin,
			"diaMax":             t.DiaMax,
			"glucoseMin":         t.GlucoseMin,
			"glucoseMax":         t.GlucoseMax,
			"effectiveFrom":      t.EffectiveFrom,
			"effectiveTo":        t.EffectiveTo,
			"updatedAt":          time.Now().UTC(),
		},
	}

	_, err := r.col.UpdateByID(ctx, t.ID, update)
	if err != nil {
		return nil, err
	}

	var updated domain.Threshold
	if err := r.col.FindOne(ctx, bson.M{"_id": t.ID}).Decode(&updated); err != nil {
		return nil, err
	}

	return &updated, nil
}
