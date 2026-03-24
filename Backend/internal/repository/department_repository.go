package repository

import (
	"context"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DepartmentRepository interface {
	Create(ctx context.Context, dept *domain.Department) (*domain.Department, error)
	FindAll(ctx context.Context) ([]*domain.Department, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Department, error)
	FindMembersByDepartmentID(ctx context.Context, deptID primitive.ObjectID) ([]*userDomain.BaseUser, error)
	CountMembersByDepartmentIDs(ctx context.Context, deptIDs []primitive.ObjectID) (map[primitive.ObjectID]int, error)
	Update(ctx context.Context, dept *domain.Department) error
}

type departmentRepository struct {
	collection *mongo.Collection
}

func NewDepartmentRepository(db *mongo.Database) DepartmentRepository {
	return &departmentRepository{
		collection: db.Collection("departments"),
	}
}

func (r *departmentRepository) Create(ctx context.Context, dept *domain.Department) (*domain.Department, error) {
	_, err := r.collection.InsertOne(ctx, dept)
	if err != nil {
		return nil, err
	}
	return dept, nil
}

func (r *departmentRepository) FindAll(ctx context.Context) ([]*domain.Department, error) {
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var depts []*domain.Department
	if err := cursor.All(ctx, &depts); err != nil {
		return nil, err
	}
	return depts, nil
}

func (r *departmentRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Department, error) {
	var dept domain.Department
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&dept)
	if err != nil {
		return nil, err
	}
	return &dept, nil
}

func (r *departmentRepository) FindMembersByDepartmentID(ctx context.Context, deptID primitive.ObjectID) ([]*userDomain.BaseUser, error) {
	usersCollection := r.collection.Database().Collection("users")

	filter := bson.M{
		"departmentId": deptID,
		"role": bson.M{
			"$in": []userDomain.Role{userDomain.RoleDoctor, userDomain.RoleNurse},
		},
	}

	cursor, err := usersCollection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var members []*userDomain.BaseUser
	if err := cursor.All(ctx, &members); err != nil {
		return nil, err
	}

	return members, nil
}

func (r *departmentRepository) CountMembersByDepartmentIDs(ctx context.Context, deptIDs []primitive.ObjectID) (map[primitive.ObjectID]int, error) {
	counts := make(map[primitive.ObjectID]int)
	if len(deptIDs) == 0 {
		return counts, nil
	}

	usersCollection := r.collection.Database().Collection("users")
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"departmentId": bson.M{"$in": deptIDs},
			"role":         bson.M{"$in": []userDomain.Role{userDomain.RoleDoctor, userDomain.RoleNurse}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$departmentId",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := usersCollection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var grouped []struct {
		DepartmentID primitive.ObjectID `bson:"_id"`
		Count        int                `bson:"count"`
	}
	if err := cursor.All(ctx, &grouped); err != nil {
		return nil, err
	}

	for _, g := range grouped {
		counts[g.DepartmentID] = g.Count
	}

	return counts, nil
}

func (r *departmentRepository) Update(ctx context.Context, dept *domain.Department) error {
	filter := bson.M{"_id": dept.ID}
	update := bson.M{"$set": dept}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
