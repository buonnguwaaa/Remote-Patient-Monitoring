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
	FindByDoctorID(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, error)
	FindByNurseID(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, error)
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

func (r *assignmentRepository) FindByDoctorID(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, error) {
	filter := bson.M{"doctorId": doctorID}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var assignments []*domain.Assignment
	if err := cursor.All(ctx, &assignments); err != nil {
		return nil, err
	}
	return assignments, nil
}

func (r *assignmentRepository) FindByNurseID(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, error) {
	filter := bson.M{"nurseId": nurseID}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var assignments []*domain.Assignment
	if err := cursor.All(ctx, &assignments); err != nil {
		return nil, err
	}
	return assignments, nil
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
