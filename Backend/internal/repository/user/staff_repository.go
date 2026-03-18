package user

import (
	"context"
	"fmt"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// StaffEntity phản ánh đúng domain: chỉ Doctor và Nurse mới có MedicalStaff
type StaffEntity interface {
	domain.Doctor | domain.Nurse
}

type StaffRepository[T StaffEntity] interface {
	BaseUserRepository
	Create(ctx context.Context, u *T) (*T, error)
	FindStaffs(ctx context.Context, f UserFilter) ([]T, error)
	FindStaffByEmail(ctx context.Context, email string) (*T, error)
	FindStaffByID(ctx context.Context, id primitive.ObjectID) (*T, error)
	Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error
	Delete(ctx context.Context, id primitive.ObjectID) error

	CountByDepartmentID(ctx context.Context, deptID primitive.ObjectID) (int64, error)
	FindByDepartmentID(ctx context.Context, deptID primitive.ObjectID) ([]T, error)
	UpdateDepartmentID(ctx context.Context, userID primitive.ObjectID, deptID primitive.ObjectID) error
}

type staffRepository[T StaffEntity] struct {
	BaseUserRepository
	col *mongo.Collection
}

func NewStaffRepository[T StaffEntity](db *mongo.Database) StaffRepository[T] {
	return &staffRepository[T]{
		BaseUserRepository: NewBaseUserRepository(db),
		col:                db.Collection("users"),
	}
}

func (r *staffRepository[T]) Create(ctx context.Context, u *T) (*T, error) {
	now := time.Now().UTC()
	setStaffTimestamps(u, now, now)

	result, err := r.col.InsertOne(ctx, u)
	if err != nil {
		return nil, err
	}
	setStaffID(u, result.InsertedID.(primitive.ObjectID))
	return u, nil
}

func (r *staffRepository[T]) FindStaffs(ctx context.Context, f UserFilter) ([]T, error) {
	bsonFilter, opts := buildFilterAndOptions(f)
	// Ensure we only query staff (doctors or nurses)
	switch any(*new(T)).(type) {
	case domain.Doctor:
		bsonFilter["role"] = domain.RoleDoctor
	case domain.Nurse:
		bsonFilter["role"] = domain.RoleNurse
	default:
		// This should never happen due to the StaffEntity constraint, but we add it for safety
		return nil, fmt.Errorf("unsupported staff type")
	}

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []T
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}

func (r *staffRepository[T]) FindStaffByID(ctx context.Context, id primitive.ObjectID) (*T, error) {
	var u T
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *staffRepository[T]) FindStaffByEmail(ctx context.Context, email string) (*T, error) {
	var u T
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *staffRepository[T]) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	updateData["updatedAt"] = time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	return err
}

func (r *staffRepository[T]) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *staffRepository[T]) CountByDepartmentID(ctx context.Context, deptID primitive.ObjectID) (int64, error) {
	return r.col.CountDocuments(ctx, bson.M{"departmentId": deptID})
}

func (r *staffRepository[T]) FindByDepartmentID(ctx context.Context, deptID primitive.ObjectID) ([]T, error) {
	cursor, err := r.col.Find(ctx, bson.M{"departmentId": deptID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []T
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}

func (r *staffRepository[T]) UpdateDepartmentID(ctx context.Context, userID primitive.ObjectID, deptID primitive.ObjectID) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": userID}, bson.M{
		"$set": bson.M{
			"departmentId": deptID,
			"updatedAt":    time.Now().UTC(),
		},
	})
	return err
}

// Type switches vẫn cần vì Go chưa hỗ trợ field access trực tiếp trên type parameter
// Nhưng giờ chỉ cần 2 case thay vì 3 như trước

func setStaffTimestamps[T StaffEntity](u *T, createdAt, updatedAt time.Time) {
	switch v := any(u).(type) {
	case *domain.Doctor:
		v.CreatedAt = createdAt
		v.UpdatedAt = updatedAt
	case *domain.Nurse:
		v.CreatedAt = createdAt
		v.UpdatedAt = updatedAt
	}
}

func setStaffID[T StaffEntity](u *T, id primitive.ObjectID) {
	switch v := any(u).(type) {
	case *domain.Doctor:
		v.ID = id
	case *domain.Nurse:
		v.ID = id
	}
}
