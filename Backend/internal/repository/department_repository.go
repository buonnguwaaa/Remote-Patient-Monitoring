package repository

import (
	"context"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DepartmentRepository interface {
	Create(ctx context.Context, dept *domain.Department) (*domain.Department, error)
	FindAll(ctx context.Context) ([]*domain.Department, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Department, error)
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

func (r *departmentRepository) Update(ctx context.Context, dept *domain.Department) error {
	filter := bson.M{"_id": dept.ID}
	update := bson.M{"$set": dept}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
