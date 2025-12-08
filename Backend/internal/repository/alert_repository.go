package repository

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type alertRepository struct {
	col *mongo.Collection
}

type AlertRepository interface {
	Create(ctx context.Context, a *domain.Alert) (*domain.Alert, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Alert, error)
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
