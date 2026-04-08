package repository

import (
	"context"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type alertRepository struct {
	col *mongo.Collection
}

type AlertUserData struct {
	PatientName        string
	PatientAvatarURL   string
	AcknowledgedByName *string
}

type AlertRepository interface {
	Create(ctx context.Context, a *domain.Alert) (*domain.Alert, error)
	FindWithFilter(ctx context.Context, filter AlertFilter) ([]*domain.Alert, map[primitive.ObjectID]*AlertUserData, error)
	FindAlertByID(ctx context.Context, id primitive.ObjectID) (*domain.Alert, *AlertUserData, error)
	UpdateAcknowledgementByID(ctx context.Context, id primitive.ObjectID, acknowledgedBy primitive.ObjectID) (*domain.Alert, *AlertUserData, error)
}

type AlertFilter struct {
	PatientID string
	DoctorID  string
	NurseID   string
	Status    domain.Status
	Severity  domain.Severity
	IsLatest  bool
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}

type alertQueryOptions struct {
	DoctorID  *primitive.ObjectID
	NurseID   *primitive.ObjectID
	IsLatest  bool
	Offset    int
	Limit     int
	SortOrder string
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

func (r *alertRepository) FindWithFilter(ctx context.Context, filter AlertFilter) ([]*domain.Alert, map[primitive.ObjectID]*AlertUserData, error) {
	bsonFilter, queryOpts, err := buildAlertBsonFilterAndOptions(filter)
	if err != nil {
		return nil, nil, err
	}

	return r.findByFilterWithJoin(ctx, bsonFilter, queryOpts)
}

func (r *alertRepository) FindAlertByID(ctx context.Context, id primitive.ObjectID) (*domain.Alert, *AlertUserData, error) {
	alerts, userDataMap, err := r.findByFilterWithJoin(ctx, bson.M{"_id": id}, alertQueryOptions{IsLatest: true})
	if err != nil {
		return nil, nil, err
	}
	if len(alerts) == 0 {
		return nil, nil, nil
	}

	return alerts[0], userDataMap[alerts[0].ID], nil
}

func (r *alertRepository) UpdateAcknowledgementByID(
	ctx context.Context,
	id primitive.ObjectID,
	acknowledgedBy primitive.ObjectID,
) (*domain.Alert, *AlertUserData, error) {
	now := time.Now().UTC()

	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"status":         domain.StatusAck,
			"acknowledgedBy": acknowledgedBy,
			"acknowledgedAt": now,
			"updatedAt":      now,
		},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updatedAlert domain.Alert
	err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&updatedAlert)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	// Fetch the alert with joined user data
	alerts, userDataMap, err := r.findByFilterWithJoin(ctx, bson.M{"_id": updatedAlert.ID}, alertQueryOptions{IsLatest: true})
	if err != nil {
		return nil, nil, err
	}
	if len(alerts) == 0 {
		return nil, nil, nil
	}

	return alerts[0], userDataMap[alerts[0].ID], nil
}

func buildAlertBsonFilterAndOptions(filter AlertFilter) (bson.M, alertQueryOptions, error) {
	bsonFilter := bson.M{}
	queryOpts := alertQueryOptions{
		IsLatest:  filter.IsLatest,
		Offset:    filter.Offset,
		Limit:     filter.Limit,
		SortOrder: filter.SortOrder,
	}

	if filter.PatientID != "" {
		patientID, err := primitive.ObjectIDFromHex(filter.PatientID)
		if err != nil {
			return nil, alertQueryOptions{}, err
		}
		bsonFilter["patientId"] = patientID
	}

	if filter.Status != "" {
		bsonFilter["status"] = filter.Status
	}

	if filter.Severity != "" {
		bsonFilter["severity"] = filter.Severity
	}

	if filter.DoctorID != "" {
		doctorID, err := primitive.ObjectIDFromHex(filter.DoctorID)
		if err != nil {
			return nil, alertQueryOptions{}, err
		}
		queryOpts.DoctorID = &doctorID
	}

	if filter.NurseID != "" {
		nurseID, err := primitive.ObjectIDFromHex(filter.NurseID)
		if err != nil {
			return nil, alertQueryOptions{}, err
		}
		queryOpts.NurseID = &nurseID
	}

	return bsonFilter, queryOpts, nil
}

func (r *alertRepository) findByFilterWithJoin(
	ctx context.Context,
	filter bson.M,
	queryOpts alertQueryOptions,
) ([]*domain.Alert, map[primitive.ObjectID]*AlertUserData, error) {
	pipeline := buildAlertJoinPipeline(filter, queryOpts)
	cursor, err := r.col.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(ctx)

	type alertRaw struct {
		ID                 primitive.ObjectID          `bson:"_id"`
		PatientID          primitive.ObjectID          `bson:"patientId"`
		MeasurementID      primitive.ObjectID          `bson:"measurementId"`
		Violations         []domain.ThresholdViolation `bson:"violations"`
		Status             domain.Status               `bson:"status"`
		Severity           domain.Severity             `bson:"severity"`
		AcknowledgedBy     *primitive.ObjectID         `bson:"acknowledgedBy,omitempty"`
		AcknowledgedAt     *time.Time                  `bson:"acknowledgedAt,omitempty"`
		CreatedAt          time.Time                   `bson:"createdAt"`
		UpdatedAt          time.Time                   `bson:"updatedAt"`
		PatientName        string                      `bson:"patientName,omitempty"`
		PatientAvatarURL   string                      `bson:"patientAvatarUrl,omitempty"`
		AcknowledgedByName *string                     `bson:"acknowledgedByName,omitempty"`
	}

	var rawAlerts []alertRaw
	if err = cursor.All(ctx, &rawAlerts); err != nil {
		return nil, nil, err
	}

	alerts := make([]*domain.Alert, len(rawAlerts))
	userDataMap := make(map[primitive.ObjectID]*AlertUserData, len(rawAlerts))

	for i, raw := range rawAlerts {
		alerts[i] = &domain.Alert{
			ID:             raw.ID,
			PatientID:      raw.PatientID,
			MeasurementID:  raw.MeasurementID,
			Violations:     raw.Violations,
			Status:         raw.Status,
			Severity:       raw.Severity,
			AcknowledgedBy: raw.AcknowledgedBy,
			AcknowledgedAt: raw.AcknowledgedAt,
			CreatedAt:      raw.CreatedAt,
			UpdatedAt:      raw.UpdatedAt,
		}

		userDataMap[raw.ID] = &AlertUserData{
			PatientName:        raw.PatientName,
			PatientAvatarURL:   raw.PatientAvatarURL,
			AcknowledgedByName: raw.AcknowledgedByName,
		}
	}

	return alerts, userDataMap, nil
}

func buildAlertJoinPipeline(filter bson.M, queryOpts alertQueryOptions) mongo.Pipeline {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
	}

	if queryOpts.DoctorID != nil {
		pipeline = append(pipeline,
			bson.D{{Key: "$lookup", Value: bson.M{
				"from":         "assignments",
				"localField":   "patientId",
				"foreignField": "patientId",
				"as":           "assignment",
			}}},
			bson.D{{Key: "$match", Value: bson.M{
				"assignment": bson.M{
					"$elemMatch": bson.M{"doctorId": *queryOpts.DoctorID},
				},
			}}},
		)
	}

	if queryOpts.NurseID != nil {
		pipeline = append(pipeline,
			bson.D{{Key: "$lookup", Value: bson.M{
				"from":         "assignments",
				"localField":   "patientId",
				"foreignField": "patientId",
				"as":           "assignment",
			}}},
			bson.D{{Key: "$match", Value: bson.M{
				"assignment": bson.M{
					"$elemMatch": bson.M{"nurseId": *queryOpts.NurseID},
				},
			}}},
		)
	}

	sortDirection := -1
	if strings.ToLower(queryOpts.SortOrder) == "asc" {
		sortDirection = 1
	}

	pipeline = append(pipeline, bson.D{{Key: "$sort", Value: bson.M{"createdAt": sortDirection}}})

	if queryOpts.IsLatest {
		pipeline = append(pipeline, bson.D{{Key: "$limit", Value: 1}})
	} else {
		if queryOpts.Offset > 0 {
			pipeline = append(pipeline, bson.D{{Key: "$skip", Value: queryOpts.Offset}})
		}
		if queryOpts.Limit > 0 {
			pipeline = append(pipeline, bson.D{{Key: "$limit", Value: queryOpts.Limit}})
		}
	}

	pipeline = append(pipeline,
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "patientId",
			"foreignField": "_id",
			"as":           "patient",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$patient", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "acknowledgedBy",
			"foreignField": "_id",
			"as":           "acknowledgedDoctor",
		}}},
		bson.D{{Key: "$unwind", Value: bson.M{"path": "$acknowledgedDoctor", "preserveNullAndEmptyArrays": true}}},
		bson.D{{Key: "$project", Value: bson.M{
			"_id":                1,
			"patientId":          1,
			"measurementId":      1,
			"violations":         1,
			"status":             1,
			"severity":           1,
			"acknowledgedBy":     1,
			"acknowledgedAt":     1,
			"createdAt":          1,
			"updatedAt":          1,
			"patientName":        "$patient.name",
			"patientAvatarUrl":   "$patient.avatarUrl",
			"acknowledgedByName": "$acknowledgedDoctor.name",
		}}},
	)

	return pipeline
}
