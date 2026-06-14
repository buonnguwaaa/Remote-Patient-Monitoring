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

type prescriptionRepository struct {
	col *mongo.Collection
}

type PrescriptionRepository interface {
	Create(ctx context.Context, p *domain.Prescription) (*domain.Prescription, error)
	FindWithFilter(ctx context.Context, filter PrescriptionFilter) ([]domain.Prescription, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Prescription, error)
	Update(ctx context.Context, p *domain.Prescription) (*domain.Prescription, error)
	UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.PrescriptionStatus) (*domain.Prescription, error)
	DeleteByID(ctx context.Context, id primitive.ObjectID) error
}

type PrescriptionFilter struct {
	PatientID string
	Status    domain.PrescriptionStatus
	IsLatest  bool
}

func NewPrescriptionRepository(db *mongo.Database) PrescriptionRepository {
	repo := &prescriptionRepository{
		col: db.Collection("prescriptions"),
	}

	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure prescription indexes: %v", err)
	}

	return repo
}

func (r *prescriptionRepository) ensureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "patientId", Value: 1}},
		},
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "createdAt", Value: -1},
			},
		},
	}

	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
}

func (r *prescriptionRepository) Create(ctx context.Context, prescription *domain.Prescription) (*domain.Prescription, error) {
	now := time.Now().UTC()
	prescription.CreatedAt = now
	prescription.UpdatedAt = now

	result, err := r.col.InsertOne(ctx, prescription)
	if err != nil {
		return nil, err
	}

	prescription.ID = result.InsertedID.(primitive.ObjectID)
	return prescription, nil
}

func (r *prescriptionRepository) FindWithFilter(ctx context.Context, filter PrescriptionFilter) ([]domain.Prescription, error) {
	bsonFilter := bson.M{}

	if filter.PatientID != "" {
		patientID, err := primitive.ObjectIDFromHex(filter.PatientID)
		if err != nil {
			return nil, err
		}
		bsonFilter["patientId"] = patientID
	}

	if filter.Status != "" {
		bsonFilter["status"] = filter.Status
	}

	if filter.IsLatest {
		opts := options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})
		var result domain.Prescription

		err := r.col.FindOne(ctx, bsonFilter, opts).Decode(&result)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return []domain.Prescription{}, nil
			}
			return nil, err
		}

		return []domain.Prescription{result}, nil
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var prescriptions []domain.Prescription
	if err = cursor.All(ctx, &prescriptions); err != nil {
		return nil, err
	}

	return prescriptions, nil
}

func (r *prescriptionRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Prescription, error) {
	filter := bson.M{"_id": id}
	var prescription domain.Prescription
	if err := r.col.FindOne(ctx, filter).Decode(&prescription); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &prescription, nil
}

func (r *prescriptionRepository) Update(ctx context.Context, prescription *domain.Prescription) (*domain.Prescription, error) {
	now := time.Now().UTC()
	prescription.UpdatedAt = now

	update := bson.M{
		"medications": prescription.Medications,
		"timezone":    prescription.Timezone,
		"daysOfWeek":  prescription.DaysOfWeek,
		"startDate":   prescription.StartDate,
		"endDate":     prescription.EndDate,
		"status":      prescription.Status,
		"updatedAt":   prescription.UpdatedAt,
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedPrescription domain.Prescription
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": prescription.ID}, bson.M{"$set": update}, opts).Decode(&updatedPrescription)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updatedPrescription, nil
}

func (r *prescriptionRepository) DeleteByID(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *prescriptionRepository) UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.PrescriptionStatus) (*domain.Prescription, error) {
	now := time.Now().UTC()

	update := bson.M{
		"status":    status,
		"updatedAt": now,
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedPrescription domain.Prescription
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": update}, opts).Decode(&updatedPrescription)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updatedPrescription, nil
}
