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

type reminderRepository struct {
	col *mongo.Collection
}

type ReminderRepository interface {
	Create(ctx context.Context, r *domain.Reminder) (*domain.Reminder, error)
	FindWithFilter(ctx context.Context, filter ReminderFilter) ([]domain.Reminder, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Reminder, error)
	Update(ctx context.Context, r *domain.Reminder) (*domain.Reminder, error)
	UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.ReminderStatus) (*domain.Reminder, error)
}

type ReminderFilter struct {
	PatientID string
	Status    domain.ReminderStatus
	Kind      domain.Kind
	IsLatest  bool
}

func NewReminderRepository(db *mongo.Database) ReminderRepository {
	return &reminderRepository{
		col: db.Collection("reminders"),
	}
}

func (r *reminderRepository) Create(ctx context.Context, reminder *domain.Reminder) (*domain.Reminder, error) {
	now := time.Now().UTC()
	reminder.CreatedAt = now
	reminder.UpdatedAt = now

	result, err := r.col.InsertOne(ctx, reminder)
	if err != nil {
		return nil, err
	}

	reminder.ID = result.InsertedID.(primitive.ObjectID)
	return reminder, nil
}

func (r *reminderRepository) FindWithFilter(ctx context.Context, filter ReminderFilter) ([]domain.Reminder, error) {
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

	if filter.Kind != "" {
		bsonFilter["kind"] = filter.Kind
	}

	if filter.IsLatest {
		opts := options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})
		var result domain.Reminder

		err := r.col.FindOne(ctx, bsonFilter, opts).Decode(&result)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return []domain.Reminder{}, nil
			}
			return nil, err
		}

		return []domain.Reminder{result}, nil
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var reminders []domain.Reminder
	if err = cursor.All(ctx, &reminders); err != nil {
		return nil, err
	}

	return reminders, nil
}

func (r *reminderRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Reminder, error) {
	filter := bson.M{"_id": id}
	var reminder domain.Reminder
	if err := r.col.FindOne(ctx, filter).Decode(&reminder); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &reminder, nil
}

func (r *reminderRepository) Update(ctx context.Context, reminder *domain.Reminder) (*domain.Reminder, error) {
	now := time.Now().UTC()
	reminder.UpdatedAt = now

	update := bson.M{
		"message":    reminder.Message,
		"status":     reminder.Status,
		"hour":       reminder.Hour,
		"minute":     reminder.Minute,
		"daysOfWeek": reminder.DaysOfWeek,
		"timezone":   reminder.Timezone,
		"startDate":  reminder.StartDate,
		"endDate":    reminder.EndDate,
		"updatedAt":  reminder.UpdatedAt,
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedReminder domain.Reminder
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": reminder.ID}, bson.M{"$set": update}, opts).Decode(&updatedReminder)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updatedReminder, nil
}

func (r *reminderRepository) UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.ReminderStatus) (*domain.Reminder, error) {
	now := time.Now().UTC()

	update := bson.M{
		"status":    status,
		"updatedAt": now,
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updatedReminder domain.Reminder
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": update}, opts).Decode(&updatedReminder)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updatedReminder, nil
}
