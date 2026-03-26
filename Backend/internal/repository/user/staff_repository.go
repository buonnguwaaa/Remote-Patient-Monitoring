package user

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
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
	id := primitive.NewObjectID()
	now := time.Now().UTC()
	setStaffInfo(u, id, now)

	_, err := r.col.InsertOne(ctx, u)
	if err != nil {
		return nil, err
	}

	return u, nil
}

func (r *staffRepository[T]) FindStaffs(ctx context.Context, f UserFilter) ([]T, error) {
	bsonFilter, opts := buildFilterAndOptions(f)
	expectedRole := expectedStaffRole[T]()
	if expectedRole == "" {
		return nil, invalidStaffRoleError[T]()
	}
	bsonFilter["role"] = expectedRole

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

	expectedRole := expectedStaffRole[T]()
	if expectedRole == "" {
		return nil, invalidStaffRoleError[T]()
	}
	if roleOfStaff(u) != expectedRole {
		return nil, invalidStaffRoleError[T]()
	}

	return &u, nil
}

func (r *staffRepository[T]) FindStaffByEmail(ctx context.Context, email string) (*T, error) {
	var u T
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}

	expectedRole := expectedStaffRole[T]()
	if expectedRole == "" {
		return nil, invalidStaffRoleError[T]()
	}
	if roleOfStaff(u) != expectedRole {
		return nil, invalidStaffRoleError[T]()
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
	filter := bson.M{"departmentId": deptID}
	expectedRole := expectedStaffRole[T]()
	if expectedRole == "" {
		return 0, invalidStaffRoleError[T]()
	}
	filter["role"] = expectedRole

	return r.col.CountDocuments(ctx, filter)
}

func (r *staffRepository[T]) FindByDepartmentID(ctx context.Context, deptID primitive.ObjectID) ([]T, error) {
	filter := bson.M{"departmentId": deptID}
	expectedRole := expectedStaffRole[T]()
	if expectedRole == "" {
		return nil, invalidStaffRoleError[T]()
	}
	filter["role"] = expectedRole

	cursor, err := r.col.Find(ctx, filter)
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
func setStaffInfo[T StaffEntity](u *T, id primitive.ObjectID, now time.Time) {
	switch v := any(u).(type) {
	case *domain.Doctor:
		v.ID = id
		v.UserPublicID = util.GenerateUserPublicID(id, domain.RoleDoctor)
		v.CreatedAt = now
		v.UpdatedAt = now
	case *domain.Nurse:
		v.ID = id
		v.UserPublicID = util.GenerateUserPublicID(id, domain.RoleNurse)
		v.CreatedAt = now
		v.UpdatedAt = now
	}
}

func expectedStaffRole[T StaffEntity]() domain.Role {
	switch any(*new(T)).(type) {
	case domain.Doctor:
		return domain.RoleDoctor
	case domain.Nurse:
		return domain.RoleNurse
	default:
		return ""
	}
}

func invalidStaffRoleError[T StaffEntity]() error {
	expected := expectedStaffRole[T]()
	if expected == "" {
		return errors.New("invalid staff type")
	}
	return fmt.Errorf("invalid role: expected %s", expected)
}

func roleOfStaff[T StaffEntity](u T) domain.Role {
	switch v := any(u).(type) {
	case domain.Doctor:
		return v.Role
	case domain.Nurse:
		return v.Role
	default:
		return ""
	}
}
