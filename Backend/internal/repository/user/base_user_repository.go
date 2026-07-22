package user

import (
	"context"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// BaseUserRepository handles role-agnostic operations on users.
// Only operate on BaseUser fields to avoid accidentally modifying role-specific data.
type BaseUserRepository interface {
	FindByID(ctx context.Context, id primitive.ObjectID) (*domain.BaseUser, error)
	FindByEmail(ctx context.Context, email string) (*domain.BaseUser, error)
	FindByPhoneLookupHash(ctx context.Context, hash string) (*domain.BaseUser, error)
	FindWithFilter(ctx context.Context, f UserFilter) ([]domain.BaseUser, error)
	ExistsByIDAndRole(ctx context.Context, id primitive.ObjectID, role domain.Role) (bool, error)
	Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error
	Delete(ctx context.Context, id primitive.ObjectID) error

	SetResetToken(ctx context.Context, email, token string, expires time.Time) error
	SetResetTokenByID(ctx context.Context, id primitive.ObjectID, token string, expires time.Time) error
	FindByEmailAndResetOTP(ctx context.Context, email, otpHash string) (*domain.BaseUser, error)
	FindByValidResetToken(ctx context.Context, tokenHash string) (*domain.BaseUser, error)
	ResetPassword(ctx context.Context, id primitive.ObjectID, hashed string) error

	EnsureIndexes(ctx context.Context) error
}

type baseUserRepository struct {
	col *mongo.Collection
}

func NewBaseUserRepository(db *mongo.Database) BaseUserRepository {
	return &baseUserRepository{
		col: db.Collection("users"),
	}
}

type UserFilter struct {
	Name      string
	Email     string
	Gender    string
	Role      string
	Page      int
	Limit     int
	Offset    int
	SortOrder string

	DiseaseBloodPressure *bool
	DiseaseGlucose       *bool
}

func (r *baseUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.BaseUser, error) {
	var u domain.BaseUser
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *baseUserRepository) FindByEmail(ctx context.Context, email string) (*domain.BaseUser, error) {
	var u domain.BaseUser
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *baseUserRepository) FindByPhoneLookupHash(ctx context.Context, hash string) (*domain.BaseUser, error) {
	var u domain.BaseUser
	err := r.col.FindOne(ctx, bson.M{"phoneLookupHash": hash}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *baseUserRepository) FindWithFilter(ctx context.Context, f UserFilter) ([]domain.BaseUser, error) {
	bsonFilter, opts := buildFilterAndOptions(f)

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []domain.BaseUser
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return results, nil
}

func (r *baseUserRepository) ExistsByIDAndRole(ctx context.Context, id primitive.ObjectID, role domain.Role) (bool, error) {
	count, err := r.col.CountDocuments(ctx, bson.M{"_id": id, "role": role})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *baseUserRepository) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	updateData["updatedAt"] = time.Now().UTC()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": updateData})
	return err
}

func (r *baseUserRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	return err
}

func (r *baseUserRepository) SetResetToken(ctx context.Context, email, token string, expires time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"email": email}, bson.M{
		"$set": bson.M{
			"resetToken":       token,
			"resetTokenExpiry": expires,
			"updatedAt":        time.Now().UTC(),
		},
	})
	return err
}

func (r *baseUserRepository) SetResetTokenByID(ctx context.Context, id primitive.ObjectID, token string, expires time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"resetToken":       token,
			"resetTokenExpiry": expires,
			"updatedAt":        time.Now().UTC(),
		},
	})
	return err
}

func (r *baseUserRepository) FindByEmailAndResetOTP(ctx context.Context, email, otpHash string) (*domain.BaseUser, error) {
	var u domain.BaseUser
	err := r.col.FindOne(ctx, bson.M{
		"email":            email,
		"resetToken":       otpHash,
		"resetTokenExpiry": bson.M{"$gt": time.Now()},
	}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *baseUserRepository) FindByValidResetToken(ctx context.Context, tokenHash string) (*domain.BaseUser, error) {
	var u domain.BaseUser
	err := r.col.FindOne(ctx, bson.M{
		"resetToken":       tokenHash,
		"resetTokenExpiry": bson.M{"$gt": time.Now()},
	}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *baseUserRepository) ResetPassword(ctx context.Context, id primitive.ObjectID, hashed string) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"password":        hashed,
			"mustSetPassword": false,
			"updatedAt":       time.Now().UTC(),
		},
		"$unset": bson.M{"resetToken": "", "resetTokenExpiry": ""},
	})
	return err
}

func buildFilterAndOptions(f UserFilter) (bson.M, *options.FindOptions) {
	bsonFilter := bson.M{}
	opts := options.Find()

	if f.Name != "" {
		bsonFilter["name"] = bson.M{"$regex": f.Name, "$options": "i"}
	}
	if f.Email != "" {
		bsonFilter["email"] = bson.M{"$regex": f.Email, "$options": "i"}
	}
	if f.Gender != "" {
		bsonFilter["gender"] = f.Gender
	}
	if f.Role != "" {
		bsonFilter["role"] = f.Role
	}
	if f.Limit > 0 {
		opts.SetLimit(int64(f.Limit))
	}
	opts.SetSkip(int64(f.Offset))

	switch f.SortOrder {
	case "desc":
		opts.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	default:
		opts.SetSort(bson.D{{Key: "createdAt", Value: 1}})
	}

	return bsonFilter, opts
}

func (r *baseUserRepository) EnsureIndexes(ctx context.Context) error {
	if err := r.migrateOptionalEmailIndex(ctx); err != nil {
		return err
	}

	models := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("ux_user_email").SetPartialFilterExpression(bson.M{"email": bson.M{"$type": "string"}}),
		},
		{
			Keys:    bson.D{{Key: "phoneLookupHash", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("ux_user_phone_lookup").SetPartialFilterExpression(bson.M{"phoneLookupHash": bson.M{"$type": "string"}}),
		},
		{
			Keys:    bson.D{{Key: "role", Value: 1}, {Key: "createdAt", Value: -1}},
			Options: options.Index().SetName("idx_user_role_created"),
		},
		{
			Keys:    bson.D{{Key: "role", Value: 1}, {Key: "diseaseTypes.bloodPressure", Value: 1}},
			Options: options.Index().SetName("idx_patient_disease_bp"),
		},
		{
			Keys:    bson.D{{Key: "role", Value: 1}, {Key: "diseaseTypes.glucose", Value: 1}},
			Options: options.Index().SetName("idx_patient_disease_glucose"),
		},
		{
			Keys:    bson.D{{Key: "departmentId", Value: 1}, {Key: "role", Value: 1}},
			Options: options.Index().SetName("idx_user_department_role"),
		},
		{
			Keys:    bson.D{{Key: "resetToken", Value: 1}},
			Options: options.Index().SetSparse(true).SetName("idx_user_reset_token"),
		},
	}

	_, err := r.col.Indexes().CreateMany(ctx, models)
	return err
}

func (r *baseUserRepository) migrateOptionalEmailIndex(ctx context.Context) error {
	cursor, err := r.col.Indexes().List(ctx)
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var indexes []bson.M
	if err := cursor.All(ctx, &indexes); err != nil {
		return err
	}
	for _, index := range indexes {
		if index["name"] == "ux_user_email" && index["partialFilterExpression"] == nil {
			if _, err := r.col.Indexes().DropOne(ctx, "ux_user_email"); err != nil {
				return err
			}
		}
		if index["name"] == "idx_user_activation_token" {
			if _, err := r.col.Indexes().DropOne(ctx, "idx_user_activation_token"); err != nil {
				return err
			}
		}
	}

	_, err = r.col.UpdateMany(ctx, bson.M{}, bson.M{
		"$unset": bson.M{
			"activationTokenHash":   "",
			"activationTokenExpiry": "",
		},
	})
	if err != nil {
		return err
	}
	_, err = r.col.UpdateMany(ctx, bson.M{"email": ""}, bson.M{"$unset": bson.M{"email": ""}})
	return err
}
