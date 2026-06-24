package repository

import (
	"context"
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AssignmentRepository interface {
	Create(ctx context.Context, assignment *domain.Assignment) (*domain.Assignment, error)
	FindAll(ctx context.Context) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error)
	FindByPatientID(ctx context.Context, patientID primitive.ObjectID) (*domain.Assignment, error)
	HasAssignmentRecordForPair(ctx context.Context, firstID primitive.ObjectID, secondID primitive.ObjectID) (bool, error)
	FindByDoctorID(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, error)
	FindByDoctorIDWithNames(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error)
	FindByNurseIDWithNames(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error)
	DeleteByID(ctx context.Context, assignmentID primitive.ObjectID) error
}

type UserDisplayInfo struct {
	Name         string
	PublicID     string
	DiseaseTypes userDomain.DiseaseTypes
}

type assignmentRepository struct {
	collection *mongo.Collection
}

func NewAssignmentRepository(db *mongo.Database) AssignmentRepository {
	repo := &assignmentRepository{
		collection: db.Collection("assignments"),
	}
	if err := repo.EnsureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure assignment indexes: %v", err)
	}
	return repo
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

func (r *assignmentRepository) HasAssignmentRecordForPair(ctx context.Context, firstID primitive.ObjectID, secondID primitive.ObjectID) (bool, error) {
	filter := bson.M{
		"$or": bson.A{
			bson.M{"patientId": firstID, "doctorId": secondID},
			bson.M{"patientId": secondID, "doctorId": firstID},
		},
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *assignmentRepository) FindAll(ctx context.Context) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$sort", Value: bson.M{"updatedAt": -1}}},
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
				bson.M{"$project": bson.M{"_id": 1, "name": "$user.name", "publicId": "$user.userPublicId", "diseaseTypes": "$user.diseaseTypes"}},
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
			ID           primitive.ObjectID      `bson:"_id"`
			Name         string                  `bson:"name"`
			PublicID     string                  `bson:"publicId"`
			DiseaseTypes userDomain.DiseaseTypes `bson:"diseaseTypes"`
		} `bson:"names"`
	}
	if err := cursor.All(ctx, &facetResults); err != nil {
		return nil, nil, err
	}

	if len(facetResults) == 0 {
		return []*domain.Assignment{}, map[primitive.ObjectID]UserDisplayInfo{}, nil
	}

	nameMap := make(map[primitive.ObjectID]UserDisplayInfo)
	for _, u := range facetResults[0].Names {
		nameMap[u.ID] = UserDisplayInfo{Name: u.Name, PublicID: u.PublicID, DiseaseTypes: u.DiseaseTypes}
	}

	return facetResults[0].Assignments, nameMap, nil
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

func (r *assignmentRepository) FindByDoctorIDWithNames(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	return r.findByAssigneeWithNames(ctx, "doctorId", doctorID)
}

func (r *assignmentRepository) FindByNurseIDWithNames(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	return r.findByAssigneeWithNames(ctx, "nurseId", nurseID)
}

func (r *assignmentRepository) findByAssigneeWithNames(ctx context.Context, matchField string, assigneeID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
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
				bson.M{"$project": bson.M{"_id": 1, "name": "$user.name", "publicId": "$user.userPublicId", "diseaseTypes": "$user.diseaseTypes"}},
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
			ID           primitive.ObjectID      `bson:"_id"`
			Name         string                  `bson:"name"`
			PublicID     string                  `bson:"publicId"`
			DiseaseTypes userDomain.DiseaseTypes `bson:"diseaseTypes"`
		} `bson:"names"`
	}
	if err := cursor.All(ctx, &facetResults); err != nil {
		return nil, nil, err
	}

	if len(facetResults) == 0 {
		return []*domain.Assignment{}, map[primitive.ObjectID]UserDisplayInfo{}, nil
	}

	nameMap := make(map[primitive.ObjectID]UserDisplayInfo)
	for _, u := range facetResults[0].Names {
		nameMap[u.ID] = UserDisplayInfo{Name: u.Name, PublicID: u.PublicID, DiseaseTypes: u.DiseaseTypes}
	}

	return facetResults[0].Assignments, nameMap, nil
}

func (r *assignmentRepository) DeleteByID(ctx context.Context, assignmentID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": assignmentID})
	return err
}

func (r *assignmentRepository) EnsureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "patientId", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "doctorId", Value: 1}}},
		{Keys: bson.D{{Key: "nurseId", Value: 1}}},
		{
			Keys:    bson.D{{Key: "patientId", Value: 1}, {Key: "doctorId", Value: 1}},
			Options: options.Index().SetName("idx_assignment_patient_doctor"),
		},
	})
	return err
}
