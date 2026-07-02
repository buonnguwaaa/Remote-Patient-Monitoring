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
	DiscontinueActiveForPatient(ctx context.Context, patientID primitive.ObjectID, excludeID *primitive.ObjectID) ([]primitive.ObjectID, error)
	DeleteByID(ctx context.Context, id primitive.ObjectID) error
}

type PrescriptionFilter struct {
	PatientID    string
	Status       domain.PrescriptionStatus
	IsLatest     bool
	DoctorID     string
	NurseID      string
	PrescribedBy string
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
				{Key: "startDate", Value: -1},
			},
			Options: options.Index().SetName("idx_prescription_patient_start_date"),
		},
		{
			Keys: bson.D{
				{Key: "prescribedBy", Value: 1},
				{Key: "startDate", Value: -1},
			},
			Options: options.Index().SetName("idx_prescription_prescribed_by_start_date"),
		},
		{
			Keys: bson.D{
				{Key: "patientId", Value: 1},
				{Key: "status", Value: 1},
				{Key: "startDate", Value: -1},
			},
			Options: options.Index().SetName("idx_prescription_patient_status_start_date"),
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

func applyPrescriptionFilterDefaults(filter PrescriptionFilter) PrescriptionFilter {
	if filter.IsLatest && filter.Status == "" {
		filter.Status = domain.PrescriptionStatusActive
	}
	return filter
}

func buildPrescriptionQuery(filter PrescriptionFilter, now time.Time) bson.M {
	query := bson.M{}

	if filter.PatientID != "" {
		if patientID, err := primitive.ObjectIDFromHex(filter.PatientID); err == nil {
			query["patientId"] = patientID
		}
	}

	if filter.Status != "" {
		query["status"] = filter.Status
	}

	if filter.PrescribedBy != "" {
		if prescribedBy, err := primitive.ObjectIDFromHex(filter.PrescribedBy); err == nil {
			query["prescribedBy"] = prescribedBy
		}
	}

	if filter.IsLatest || filter.Status == domain.PrescriptionStatusActive {
		query["startDate"] = bson.M{"$lte": now}
	}

	return query
}

func filterOpenPrescriptions(prescriptions []domain.Prescription, now time.Time) []domain.Prescription {
	filtered := make([]domain.Prescription, 0, len(prescriptions))
	for _, prescription := range prescriptions {
		if domain.IsPrescriptionOpen(&prescription, now) {
			filtered = append(filtered, prescription)
		}
	}
	return filtered
}

func pickLatestOpenPrescription(prescriptions []domain.Prescription, now time.Time) []domain.Prescription {
	for _, prescription := range prescriptions {
		if domain.IsPrescriptionOpen(&prescription, now) {
			return []domain.Prescription{prescription}
		}
	}
	return []domain.Prescription{}
}

func applyActiveStatusFilter(prescriptions []domain.Prescription, filter PrescriptionFilter, now time.Time) []domain.Prescription {
	if filter.Status != domain.PrescriptionStatusActive {
		return prescriptions
	}
	return filterOpenPrescriptions(prescriptions, now)
}

func (r *prescriptionRepository) FindWithFilter(ctx context.Context, filter PrescriptionFilter) ([]domain.Prescription, error) {
	filter = applyPrescriptionFilterDefaults(filter)
	now := time.Now().UTC()
	query := buildPrescriptionQuery(filter, now)
	sort := bson.D{{Key: "startDate", Value: -1}}

	if filter.DoctorID != "" || filter.NurseID != "" {
		pipeline := mongo.Pipeline{{{Key: "$match", Value: query}}}

		if filter.DoctorID != "" {
			doctorID, err := primitive.ObjectIDFromHex(filter.DoctorID)
			if err != nil {
				return nil, err
			}
			pipeline = append(pipeline,
				bson.D{{Key: "$lookup", Value: bson.M{
					"from":         "assignments",
					"localField":   "patientId",
					"foreignField": "patientId",
					"as":           "assignment",
				}}},
				bson.D{{Key: "$match", Value: bson.M{
					"assignment": bson.M{"$elemMatch": bson.M{"doctorId": doctorID}},
				}}},
			)
		}

		if filter.NurseID != "" {
			nurseID, err := primitive.ObjectIDFromHex(filter.NurseID)
			if err != nil {
				return nil, err
			}
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
			)
		}

		pipeline = append(pipeline, bson.D{{Key: "$sort", Value: sort}})
		if !filter.IsLatest {
			pipeline = append(pipeline, bson.D{{Key: "$project", Value: bson.M{"assignment": 0}}})
		} else {
			pipeline = append(pipeline,
				bson.D{{Key: "$limit", Value: 20}},
				bson.D{{Key: "$project", Value: bson.M{"assignment": 0}}},
			)
		}

		cursor, err := r.col.Aggregate(ctx, pipeline)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var prescriptions []domain.Prescription
		if err = cursor.All(ctx, &prescriptions); err != nil {
			return nil, err
		}

		prescriptions = applyActiveStatusFilter(prescriptions, filter, now)
		if filter.IsLatest {
			return pickLatestOpenPrescription(prescriptions, now), nil
		}
		return prescriptions, nil
	}

	if filter.IsLatest {
		opts := options.Find().SetSort(sort).SetLimit(20)
		cursor, err := r.col.Find(ctx, query, opts)
		if err != nil {
			return nil, err
		}
		defer cursor.Close(ctx)

		var prescriptions []domain.Prescription
		if err := cursor.All(ctx, &prescriptions); err != nil {
			return nil, err
		}

		return pickLatestOpenPrescription(prescriptions, now), nil
	}

	opts := options.Find().SetSort(sort)
	cursor, err := r.col.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var prescriptions []domain.Prescription
	if err := cursor.All(ctx, &prescriptions); err != nil {
		return nil, err
	}

	return applyActiveStatusFilter(prescriptions, filter, now), nil
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

func (r *prescriptionRepository) DiscontinueActiveForPatient(ctx context.Context, patientID primitive.ObjectID, excludeID *primitive.ObjectID) ([]primitive.ObjectID, error) {
	now := time.Now().UTC()
	filter := bson.M{
		"patientId": patientID,
		"status":    domain.PrescriptionStatusActive,
		"startDate": bson.M{"$lte": now},
	}
	if excludeID != nil {
		filter["_id"] = bson.M{"$ne": *excludeID}
	}

	cursor, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "startDate", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var candidates []domain.Prescription
	if err := cursor.All(ctx, &candidates); err != nil {
		return nil, err
	}

	open := filterOpenPrescriptions(candidates, now)
	if len(open) == 0 {
		return nil, nil
	}

	discontinued := make([]primitive.ObjectID, 0, len(open))
	for _, prescription := range open {
		discontinued = append(discontinued, prescription.ID)
	}

	_, err = r.col.UpdateMany(ctx, bson.M{"_id": bson.M{"$in": discontinued}}, bson.M{
		"$set": bson.M{
			"status":    domain.PrescriptionStatusDiscontinued,
			"updatedAt": now,
		},
	})
	if err != nil {
		return nil, err
	}

	return discontinued, nil
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
