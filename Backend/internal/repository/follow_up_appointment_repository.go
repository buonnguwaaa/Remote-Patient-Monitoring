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

type FollowUpAppointmentRepository interface {
	Create(ctx context.Context, appointment *domain.FollowUpAppointment) (*domain.FollowUpAppointment, error)
	FindWithFilter(ctx context.Context, filter FollowUpAppointmentFilter) ([]domain.FollowUpAppointment, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.FollowUpAppointment, error)
	HasScheduledConflict(ctx context.Context, doctorID primitive.ObjectID, scheduledAt time.Time, durationMinutes int, excludeID *primitive.ObjectID) (bool, error)
	Update(ctx context.Context, appointment *domain.FollowUpAppointment) (*domain.FollowUpAppointment, error)
	UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.FollowUpAppointmentStatus) (*domain.FollowUpAppointment, error)
}

type FollowUpAppointmentFilter struct {
	PatientID string
	DoctorID  string
	NurseID   string
	Status    domain.FollowUpAppointmentStatus
	From      *time.Time
	To        *time.Time
}

type followUpAppointmentRepository struct {
	col *mongo.Collection
}

func NewFollowUpAppointmentRepository(db *mongo.Database) FollowUpAppointmentRepository {
	repo := &followUpAppointmentRepository{
		col: db.Collection("follow_up_appointments"),
	}

	if err := repo.ensureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure follow-up appointment indexes: %v", err)
	}

	return repo
}

func (r *followUpAppointmentRepository) ensureIndexes(ctx context.Context) error {
	models := []mongo.IndexModel{
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "scheduledAt", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "doctorId", Value: 1},
				{Key: "scheduledAt", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "status", Value: 1},
				{Key: "scheduledAt", Value: 1},
			},
		},
		{
			Keys: bson.D{
				{Key: "doctorId", Value: 1},
				{Key: "scheduledAt", Value: 1},
			},
			Options: options.Index().
				SetUnique(true).
				SetPartialFilterExpression(bson.M{"status": domain.FollowUpAppointmentStatusScheduled}).
				SetName("ux_doctor_scheduled_slot"),
		},
	}

	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
}

func (r *followUpAppointmentRepository) Create(ctx context.Context, appointment *domain.FollowUpAppointment) (*domain.FollowUpAppointment, error) {
	now := time.Now().UTC()
	appointment.CreatedAt = now
	appointment.UpdatedAt = now

	result, err := r.col.InsertOne(ctx, appointment)
	if err != nil {
		return nil, err
	}

	appointment.ID = result.InsertedID.(primitive.ObjectID)
	return appointment, nil
}

func (r *followUpAppointmentRepository) buildBSONFilter(filter FollowUpAppointmentFilter) (bson.M, error) {
	bsonFilter := bson.M{}

	if filter.PatientID != "" {
		patientID, err := primitive.ObjectIDFromHex(filter.PatientID)
		if err != nil {
			return nil, err
		}
		bsonFilter["patientId"] = patientID
	}

	if filter.DoctorID != "" {
		doctorID, err := primitive.ObjectIDFromHex(filter.DoctorID)
		if err != nil {
			return nil, err
		}
		bsonFilter["doctorId"] = doctorID
	}

	if filter.Status != "" {
		bsonFilter["status"] = filter.Status
	}

	if filter.From != nil || filter.To != nil {
		dateFilter := bson.M{}
		if filter.From != nil {
			dateFilter["$gte"] = filter.From.UTC()
		}
		if filter.To != nil {
			dateFilter["$lte"] = filter.To.UTC()
		}
		bsonFilter["scheduledAt"] = dateFilter
	}

	return bsonFilter, nil
}

func (r *followUpAppointmentRepository) FindWithFilter(ctx context.Context, filter FollowUpAppointmentFilter) ([]domain.FollowUpAppointment, error) {
	bsonFilter, err := r.buildBSONFilter(filter)
	if err != nil {
		return nil, err
	}

	if filter.NurseID != "" {
		nurseID, err := primitive.ObjectIDFromHex(filter.NurseID)
		if err != nil {
			return nil, err
		}

		pipeline := mongo.Pipeline{{{Key: "$match", Value: bsonFilter}}}
		pipeline = append(pipeline,
			bson.D{{Key: "$lookup", Value: bson.M{
				"from":         "assignments",
				"localField":   "patientId",
				"foreignField": "patientId",
				"as":           "assignment",
			}}},
			bson.D{{Key: "$match", Value: bson.M{
				"assignment": bson.M{"$elemMatch": bson.M{"nurseId": nurseID}},
			}}},
			bson.D{{Key: "$sort", Value: bson.M{"scheduledAt": 1}}},
			bson.D{{Key: "$project", Value: bson.M{"assignment": 0}}},
		)

		cursor, err := r.col.Aggregate(ctx, pipeline)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var appointments []domain.FollowUpAppointment
		if err = cursor.All(ctx, &appointments); err != nil {
			return nil, err
		}
		return appointments, nil
	}

	opts := options.Find().SetSort(bson.D{{Key: "scheduledAt", Value: 1}})
	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var appointments []domain.FollowUpAppointment
	if err = cursor.All(ctx, &appointments); err != nil {
		return nil, err
	}

	return appointments, nil
}

func (r *followUpAppointmentRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.FollowUpAppointment, error) {
	var appointment domain.FollowUpAppointment
	if err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&appointment); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &appointment, nil
}

func (r *followUpAppointmentRepository) HasScheduledConflict(
	ctx context.Context,
	doctorID primitive.ObjectID,
	scheduledAt time.Time,
	durationMinutes int,
	excludeID *primitive.ObjectID,
) (bool, error) {
	slotStart := domain.NormalizeAppointmentSlot(scheduledAt)
	durationMinutes = domain.NormalizeAppointmentDuration(durationMinutes)
	windowStart := slotStart.Add(-time.Duration(domain.MaxAppointmentDurationMinutes) * time.Minute)
	windowEnd := domain.AppointmentSlotEnd(scheduledAt, durationMinutes)

	filter := bson.M{
		"doctorId": doctorID,
		"status":   domain.FollowUpAppointmentStatusScheduled,
		"scheduledAt": bson.M{
			"$gte": windowStart,
			"$lt":  windowEnd,
		},
	}
	if excludeID != nil && !excludeID.IsZero() {
		filter["_id"] = bson.M{"$ne": *excludeID}
	}

	cursor, err := r.col.Find(ctx, filter)
	if err != nil {
		return false, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var existing domain.FollowUpAppointment
		if err := cursor.Decode(&existing); err != nil {
			return false, err
		}
		if domain.AppointmentsOverlap(
			existing.ScheduledAt,
			existing.EffectiveDurationMinutes(),
			scheduledAt,
			durationMinutes,
		) {
			return true, nil
		}
	}

	return false, cursor.Err()
}

func (r *followUpAppointmentRepository) Update(ctx context.Context, appointment *domain.FollowUpAppointment) (*domain.FollowUpAppointment, error) {
	appointment.UpdatedAt = time.Now().UTC()

	update := bson.M{
		"scheduledAt":     appointment.ScheduledAt,
		"durationMinutes": appointment.DurationMinutes,
		"timezone":        appointment.Timezone,
		"location":        appointment.Location,
		"notes":           appointment.Notes,
		"status":          appointment.Status,
		"updatedAt":       appointment.UpdatedAt,
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updated domain.FollowUpAppointment
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": appointment.ID}, bson.M{"$set": update}, opts).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updated, nil
}

func (r *followUpAppointmentRepository) UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.FollowUpAppointmentStatus) (*domain.FollowUpAppointment, error) {
	update := bson.M{
		"status":    status,
		"updatedAt": time.Now().UTC(),
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)

	var updated domain.FollowUpAppointment
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": update}, opts).Decode(&updated)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &updated, nil
}
