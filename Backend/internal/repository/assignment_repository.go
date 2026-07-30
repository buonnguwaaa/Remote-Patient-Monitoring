package repository

import (
	"context"
	"log"
	"time"

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
	FindByID(ctx context.Context, assignmentID primitive.ObjectID) (*domain.Assignment, error)
	FindByPatientID(ctx context.Context, patientID primitive.ObjectID) (*domain.Assignment, error)
	HasAssignmentRecordForPair(ctx context.Context, firstID primitive.ObjectID, secondID primitive.ObjectID) (bool, error)
	FindByDoctorID(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, error)
	FindByDoctorIDWithNames(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error)
	FindByNurseIDWithNames(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error)
	FindByDoctorIDWithNamesPaginated(ctx context.Context, doctorID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error)
	FindByNurseIDWithNamesPaginated(ctx context.Context, nurseID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error)
	DeleteByID(ctx context.Context, assignmentID primitive.ObjectID) error
	DeleteByPatientID(ctx context.Context, patientID primitive.ObjectID) error
	// RemoveDoctorFromAssignments/RemoveNurseFromAssignments detach a
	// soft-deleted staff member from all their assignments; assignments left
	// with no assignee at all are removed.
	RemoveDoctorFromAssignments(ctx context.Context, doctorID primitive.ObjectID) error
	RemoveNurseFromAssignments(ctx context.Context, nurseID primitive.ObjectID) error
	// CountByDoctorIDs trả về map doctorId (hex string) → số bệnh nhân đang được phân công
	CountByDoctorIDs(ctx context.Context) (map[string]int64, error)
	// CountByNurseIDs trả về map nurseId (hex string) → số bệnh nhân đang được phân công
	CountByNurseIDs(ctx context.Context) (map[string]int64, error)
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

func (r *assignmentRepository) FindByID(ctx context.Context, assignmentID primitive.ObjectID) (*domain.Assignment, error) {
	var assignment domain.Assignment
	err := r.collection.FindOne(ctx, bson.M{"_id": assignmentID}).Decode(&assignment)
	if err != nil {
		return nil, err
	}
	return &assignment, nil
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

// activePatientGuardStages filters out assignments whose patient user document
// no longer exists (legacy hard deletes) or is soft-deleted, so they never
// surface as empty rows in assignment lists.
func activePatientGuardStages() mongo.Pipeline {
	return mongo.Pipeline{
		{{Key: "$lookup", Value: bson.M{
			"from":         "users",
			"localField":   "patientId",
			"foreignField": "_id",
			"as":           "patientDoc",
		}}},
		{{Key: "$match", Value: bson.M{"patientDoc": bson.M{"$elemMatch": bson.M{"status": bson.M{"$ne": userDomain.StatusDeleted}}}}}},
		{{Key: "$project", Value: bson.M{"patientDoc": 0}}},
	}
}

func (r *assignmentRepository) FindAll(ctx context.Context) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	pipeline := append(activePatientGuardStages(), mongo.Pipeline{
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
	}...)

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

func (r *assignmentRepository) FindByDoctorIDWithNamesPaginated(ctx context.Context, doctorID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error) {
	return r.findByAssigneeWithNamesPaginated(ctx, "doctorId", doctorID, offset, limit)
}

func (r *assignmentRepository) FindByNurseIDWithNamesPaginated(ctx context.Context, nurseID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error) {
	return r.findByAssigneeWithNamesPaginated(ctx, "nurseId", nurseID, offset, limit)
}

func (r *assignmentRepository) findByAssigneeWithNamesPaginated(ctx context.Context, matchField string, assigneeID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{matchField: assigneeID}}},
	}
	pipeline = append(pipeline, activePatientGuardStages()...)
	pipeline = append(pipeline, bson.D{{Key: "$facet", Value: bson.M{
		"assignments": bson.A{
			bson.M{"$sort": bson.M{"createdAt": -1}},
			bson.M{"$skip": offset},
			bson.M{"$limit": limit},
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
		"count": bson.A{
			bson.M{"$count": "total"},
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
	}}})

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, nil, 0, err
	}
	defer cursor.Close(ctx)

	var facetResults []struct {
		Assignments []*domain.Assignment `bson:"assignments"`
		Count       []struct {
			Total int64 `bson:"total"`
		} `bson:"count"`
		Names []struct {
			ID           primitive.ObjectID      `bson:"_id"`
			Name         string                  `bson:"name"`
			PublicID     string                  `bson:"publicId"`
			DiseaseTypes userDomain.DiseaseTypes `bson:"diseaseTypes"`
		} `bson:"names"`
	}
	if err := cursor.All(ctx, &facetResults); err != nil {
		return nil, nil, 0, err
	}

	if len(facetResults) == 0 {
		return []*domain.Assignment{}, map[primitive.ObjectID]UserDisplayInfo{}, 0, nil
	}

	var total int64
	if len(facetResults[0].Count) > 0 {
		total = facetResults[0].Count[0].Total
	}

	nameMap := make(map[primitive.ObjectID]UserDisplayInfo)
	for _, u := range facetResults[0].Names {
		nameMap[u.ID] = UserDisplayInfo{Name: u.Name, PublicID: u.PublicID, DiseaseTypes: u.DiseaseTypes}
	}

	return facetResults[0].Assignments, nameMap, total, nil
}

func (r *assignmentRepository) findByAssigneeWithNames(ctx context.Context, matchField string, assigneeID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{matchField: assigneeID}}},
	}
	pipeline = append(pipeline, activePatientGuardStages()...)
	pipeline = append(pipeline, bson.D{{Key: "$facet", Value: bson.M{
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
	}}})

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

func (r *assignmentRepository) DeleteByPatientID(ctx context.Context, patientID primitive.ObjectID) error {
	_, err := r.collection.DeleteOne(ctx, bson.M{"patientId": patientID})
	return err
}

func (r *assignmentRepository) RemoveDoctorFromAssignments(ctx context.Context, doctorID primitive.ObjectID) error {
	return r.removeAssigneeFromAssignments(ctx, "doctorId", doctorID)
}

func (r *assignmentRepository) RemoveNurseFromAssignments(ctx context.Context, nurseID primitive.ObjectID) error {
	return r.removeAssigneeFromAssignments(ctx, "nurseId", nurseID)
}

func (r *assignmentRepository) removeAssigneeFromAssignments(ctx context.Context, field string, staffID primitive.ObjectID) error {
	_, err := r.collection.UpdateMany(ctx,
		bson.M{field: staffID},
		bson.M{
			"$unset": bson.M{field: ""},
			"$set":   bson.M{"updatedAt": time.Now().UTC()},
		},
	)
	if err != nil {
		return err
	}

	// An assignment must have at least one assignee; drop those that lost
	// their last one (fields may be absent or stored as NilObjectID).
	noAssignee := bson.M{
		"$and": bson.A{
			bson.M{"$or": bson.A{
				bson.M{"doctorId": bson.M{"$exists": false}},
				bson.M{"doctorId": primitive.NilObjectID},
			}},
			bson.M{"$or": bson.A{
				bson.M{"nurseId": bson.M{"$exists": false}},
				bson.M{"nurseId": primitive.NilObjectID},
			}},
		},
	}
	_, err = r.collection.DeleteMany(ctx, noAssignee)
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

// CountByDoctorIDs trả về map doctorId (hex string) → số bệnh nhân đang được phân công.
// Chỉ đếm các assignment có doctorId khác NilObjectID.
func (r *assignmentRepository) CountByDoctorIDs(ctx context.Context) (map[string]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"doctorId": bson.M{"$ne": primitive.NilObjectID}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$doctorId",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[string]int64)
	var rows []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Count int64              `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ID.Hex()] = row.Count
	}
	return result, nil
}

// CountByNurseIDs trả về map nurseId (hex string) → số bệnh nhân đang được phân công.
func (r *assignmentRepository) CountByNurseIDs(ctx context.Context) (map[string]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"nurseId": bson.M{"$ne": primitive.NilObjectID}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$nurseId",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[string]int64)
	var rows []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Count int64              `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ID.Hex()] = row.Count
	}
	return result, nil
}
