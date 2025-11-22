package repository

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type measurementRepository struct {
	col *mongo.Collection
}

type MeasurementRepository interface {
	Create(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error)
	Update(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error)
	FindByPatientID(ctx context.Context, patientID string) ([]domain.Measurement, error)
	FindLatestByPatientID(ctx context.Context, patientID string) (*domain.Measurement, error)
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
	// Implementation of Update method goes here
	return nil, nil
}

func (r *measurementRepository) FindByPatientID(ctx context.Context, patientID string) ([]domain.Measurement, error) {
	// Implementation of FindByPatientID method goes here
	return nil, nil
}

func (r *measurementRepository) FindLatestByPatientID(ctx context.Context, patientID string) (*domain.Measurement, error) {
	// Implementation of FindLatestByPatientID method goes here
	return nil, nil
}
