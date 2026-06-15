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

type MedicationIntakeRepository interface {
	Create(ctx context.Context, intake *domain.MedicationIntake) (*domain.MedicationIntake, error)
	FindWithFilter(ctx context.Context, filter MedicationIntakeFilter) ([]domain.MedicationIntake, error)
	FindBySlot(ctx context.Context, patientID, prescriptionID primitive.ObjectID, drugName string, dose domain.MedicationDose, scheduledDate time.Time) (*domain.MedicationIntake, error)
}

type MedicationIntakeFilter struct {
	PatientID      string
	PrescriptionID string
	ScheduledDate  *time.Time
	ScheduledFrom  *time.Time
	ScheduledTo    *time.Time
}

type medicationIntakeRepository struct {
	col *mongo.Collection
}

func NewMedicationIntakeRepository(db *mongo.Database) MedicationIntakeRepository {
	repo := &medicationIntakeRepository{
		col: db.Collection("medication_intakes"),
	}

	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure medication intake indexes: %v", err)
	}

	return repo
}

func (r *medicationIntakeRepository) ensureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "scheduledDate", Value: -1},
			},
		},
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "prescriptionId", Value: 1},
				{Key: "drugName", Value: 1},
				{Key: "dose.timeOfDay", Value: 1},
				{Key: "dose.mealTiming", Value: 1},
				{Key: "dose.pillCount", Value: 1},
				{Key: "scheduledDate", Value: 1},
			},
			Options: options.Index().SetUnique(true),
		},
	}

	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
}

func (r *medicationIntakeRepository) Create(ctx context.Context, intake *domain.MedicationIntake) (*domain.MedicationIntake, error) {
	now := time.Now().UTC()
	intake.CreatedAt = now

	result, err := r.col.InsertOne(ctx, intake)
	if err != nil {
		return nil, err
	}

	intake.ID = result.InsertedID.(primitive.ObjectID)
	return intake, nil
}

func (r *medicationIntakeRepository) FindWithFilter(ctx context.Context, filter MedicationIntakeFilter) ([]domain.MedicationIntake, error) {
	bsonFilter := bson.M{}

	if filter.PatientID != "" {
		patientID, err := primitive.ObjectIDFromHex(filter.PatientID)
		if err != nil {
			return nil, err
		}
		bsonFilter["patientId"] = patientID
	}

	if filter.PrescriptionID != "" {
		prescriptionID, err := primitive.ObjectIDFromHex(filter.PrescriptionID)
		if err != nil {
			return nil, err
		}
		bsonFilter["prescriptionId"] = prescriptionID
	}

	if filter.ScheduledDate != nil {
		bsonFilter["scheduledDate"] = *filter.ScheduledDate
	} else if filter.ScheduledFrom != nil || filter.ScheduledTo != nil {
		dateFilter := bson.M{}
		if filter.ScheduledFrom != nil {
			dateFilter["$gte"] = *filter.ScheduledFrom
		}
		if filter.ScheduledTo != nil {
			dateFilter["$lte"] = *filter.ScheduledTo
		}
		bsonFilter["scheduledDate"] = dateFilter
	}

	opts := options.Find().SetSort(bson.D{{Key: "takenAt", Value: -1}})
	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var intakes []domain.MedicationIntake
	if err = cursor.All(ctx, &intakes); err != nil {
		return nil, err
	}

	return intakes, nil
}

func (r *medicationIntakeRepository) FindBySlot(
	ctx context.Context,
	patientID, prescriptionID primitive.ObjectID,
	drugName string,
	dose domain.MedicationDose,
	scheduledDate time.Time,
) (*domain.MedicationIntake, error) {
	filter := bson.M{
		"patientId":          patientID,
		"prescriptionId":     prescriptionID,
		"drugName":           drugName,
		"dose.timeOfDay":     dose.TimeOfDay,
		"dose.mealTiming":    dose.MealTiming,
		"dose.pillCount":     dose.PillCount,
		"scheduledDate":      scheduledDate,
	}

	var intake domain.MedicationIntake
	err := r.col.FindOne(ctx, filter).Decode(&intake)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &intake, nil
}
