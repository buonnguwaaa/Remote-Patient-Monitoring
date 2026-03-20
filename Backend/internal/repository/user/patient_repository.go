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

type PatientRepository interface {
	BaseUserRepository
	Create(ctx context.Context, u *domain.Patient) (*domain.Patient, error)
	FindPatients(ctx context.Context, f UserFilter) ([]domain.Patient, error)
	FindPatientByID(ctx context.Context, id primitive.ObjectID) (*domain.Patient, error)
	FindPatientByEmail(ctx context.Context, email string) (*domain.Patient, error)
	Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error
	Delete(ctx context.Context, id primitive.ObjectID) error
}

type patientRepository struct {
	BaseUserRepository
	col *mongo.Collection
}

func NewPatientRepository(db *mongo.Database) PatientRepository {
	return &patientRepository{
		BaseUserRepository: NewBaseUserRepository(db),
		col:                db.Collection("users"),
	}
}

func (r *patientRepository) Create(ctx context.Context, u *domain.Patient) (*domain.Patient, error) {
	now := time.Now().UTC()
	if u.Role != domain.RolePatient {
		return nil, fmt.Errorf("invalid role for patient: %s", u.Role)
	}
	u.CreatedAt = now
	u.UpdatedAt = now

	result, err := r.col.InsertOne(ctx, u)
	if err != nil {
		return nil, err
	}
	u.ID = result.InsertedID.(primitive.ObjectID)
	return u, nil
}

func (r *patientRepository) FindPatients(ctx context.Context, f UserFilter) ([]domain.Patient, error) {
	bsonFilter, opts := buildFilterAndOptions(f)
	// Ensure we only query patients
	bsonFilter["role"] = domain.RolePatient

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var patients []domain.Patient
	for cursor.Next(ctx) {
		var p domain.Patient
		if err := cursor.Decode(&p); err != nil {
			return nil, err
		}
		patients = append(patients, p)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return patients, nil
}

func (r *patientRepository) FindPatientByEmail(ctx context.Context, email string) (*domain.Patient, error) {
	var u domain.Patient
	err := r.col.FindOne(ctx, bson.M{"email": email, "role": domain.RolePatient}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *patientRepository) FindPatientByID(ctx context.Context, id primitive.ObjectID) (*domain.Patient, error) {
	var u domain.Patient
	err := r.col.FindOne(ctx, bson.M{"_id": id, "role": domain.RolePatient}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *patientRepository) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	updateData["updatedAt"] = time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	return err
}

func (r *patientRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
