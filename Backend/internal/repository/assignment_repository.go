package repository

import (
	"context"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AssignmentRepository interface {
	Create(ctx context.Context, assignment *domain.Assignment) (*domain.Assignment, error)
	FindByPatientID(ctx context.Context, patientID primitive.ObjectID) (*domain.Assignment, error)
	FindByDoctorIDWithNames(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]string, error)
	FindByNurseIDWithNames(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]string, error)
	DeleteByPatientID(ctx context.Context, patientID primitive.ObjectID) error
}

type assignmentRepository struct {
	collection *mongo.Collection
}

func NewAssignmentRepository(db *mongo.Database) AssignmentRepository {
	return &assignmentRepository{
		collection: db.Collection("assignments"),
	}
}

func (r *assignmentRepository) Create(ctx context.Context, assignment *domain.Assignment) (*domain.Assignment, error) {
	// Upsert: Remove old assignment for this patient first (assuming 1 active assignment per patient for simplicity)
	// Or we can just delete old one.
	_, _ = r.collection.DeleteOne(ctx, bson.M{"patientId": assignment.PatientID})

	_, err := r.collection.InsertOne(ctx, assignment)
	if err != nil {
		return nil, err
	}
	return assignment, nil
}

func (r *assignmentRepository) FindByPatientID(ctx context.Context, patientID primitive.ObjectID) (*domain.Assignment, error) {
	var assignment domain.Assignment
	err := r.collection.FindOne(ctx, bson.M{"patientId": patientID}).Decode(&assignment)
	if err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (r *assignmentRepository) FindByDoctorIDWithNames(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]string, error) {
	return r.findByAssigneeWithNames(ctx, "doctorId", doctorID)
}

func (r *assignmentRepository) FindByNurseIDWithNames(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]string, error) {
	return r.findByAssigneeWithNames(ctx, "nurseId", nurseID)
}

func (r *assignmentRepository) findByAssigneeWithNames(ctx context.Context, matchField string, assigneeID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]string, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{matchField: assigneeID}}},
		{{Key: "$facet", Value: bson.M{
			"assignments": bson.A{
				bson.M{"$project": bson.M{
					"_id":        1,
					"patientId":  1,
					"doctorId":   1,
					"nurseId":    1,
					"assignedBy": 1,
					"createdAt":  1,
					"updatedAt":  1,
				}},
			},
			"names": bson.A{
				bson.M{"$project": bson.M{"ids": bson.A{"$patientId", "$doctorId", "$nurseId", "$assignedBy"}}},
				bson.M{"$unwind": "$ids"},
				bson.M{"$match": bson.M{"ids": bson.M{"$ne": primitive.NilObjectID}}},
				bson.M{"$group": bson.M{"_id": "$ids"}},
				bson.M{"$lookup": bson.M{
					"from":         "users",
					"localField":   "_id",
					"foreignField": "_id",
					"as":           "user",
				}},
				bson.M{"$unwind": bson.M{"path": "$user", "preserveNullAndEmptyArrays": false}},
				bson.M{"$project": bson.M{"_id": 1, "name": "$user.name"}},
			},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(ctx)

	var facetResults []struct {
		Assignments []*domain.Assignment `bson:"assignments"`
		Names       []struct {
			ID   primitive.ObjectID `bson:"_id"`
			Name string             `bson:"name"`
		} `bson:"names"`
	}
	if err := cursor.All(ctx, &facetResults); err != nil {
		return nil, nil, err
	}

	if len(facetResults) == 0 {
		return []*domain.Assignment{}, map[primitive.ObjectID]string{}, nil
	}

	nameMap := make(map[primitive.ObjectID]string)
	for _, u := range facetResults[0].Names {
		nameMap[u.ID] = u.Name
	}

	return facetResults[0].Assignments, nameMap, nil
}

func (r *assignmentRepository) DeleteByPatientID(ctx context.Context, patientID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"patientId": patientID})
	return err
}

func (r *assignmentRepository) EnsureIndexes(ctx context.Context) error {
	// Index on patientId unique? Maybe. For now index on doctor, nurse, patient
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "patientId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "doctorId", Value: 1}}},
		{Keys: bson.D{{Key: "nurseId", Value: 1}}},
	})
	return err
}
