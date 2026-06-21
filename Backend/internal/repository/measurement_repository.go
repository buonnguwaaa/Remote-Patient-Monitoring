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

type measurementRepository struct {
	col *mongo.Collection
}

type MeasurementRepository interface {
	Create(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error)
	Update(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error)
	FindWithFilter(ctx context.Context, f MeasurementFilter) ([]domain.Measurement, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Measurement, error)
}

type MeasurementFilter struct {
	PatientID  string
	MealTiming string
	IsLatest   bool
}

func NewMeasurementRepository(db *mongo.Database) MeasurementRepository {
	repo := &measurementRepository{
		col: db.Collection("measurements"),
	}
	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure measurement indexes: %v", err)
	}
	return repo
}

func (r *measurementRepository) ensureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "createdAt", Value: -1},
			},
			Options: options.Index().SetName("idx_measurement_patient_created"),
		},
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "mealTiming", Value: 1},
				{Key: "createdAt", Value: -1},
			},
			Options: options.Index().SetName("idx_measurement_patient_meal_created"),
		},
	}
	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
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
		"temperature":     m.Temperature,
		"heartRate":       m.HeartRate,
		"respiratoryRate": m.RespiratoryRate,
		"spo2":            m.SpO2,
		"bloodPressure":   m.BloodPressure,
		"height":          m.Height,
		"weight":          m.Weight,
		"bmi":             m.BMI,
		"glucose":         m.Glucose,
		"mealTiming":      m.MealTiming,
		"device":          m.Device,
		"note":            m.Note,
		"updatedAt":       m.UpdatedAt,
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

func (r *measurementRepository) FindWithFilter(ctx context.Context, f MeasurementFilter) ([]domain.Measurement, error) {
	filter := bson.M{}

	if f.PatientID != "" {
		pid, err := primitive.ObjectIDFromHex(f.PatientID)
		if err == nil {
			filter["patientId"] = pid
		}
	}

	if f.MealTiming != "" {
		filter["mealTiming"] = f.MealTiming
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

func (r *measurementRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Measurement, error) {
	var m domain.Measurement
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&m)
	if err != nil {
		return nil, err
	}
	return &m, nil
}
