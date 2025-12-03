package repository

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type userRepository struct {
	col *mongo.Collection
}

type UserRepository interface {
	Create(context.Context, *domain.User) (*domain.User, error)
	FindAll(context.Context, UserFilter) ([]domain.User, error)
	FindByID(context.Context, primitive.ObjectID) (*domain.User, error)
	FindByEmail(context.Context, string) (*domain.User, error)
	SetResetToken(context.Context, string, string, time.Time) error
	FindByResetToken(context.Context, string) (*domain.User, error)
	ResetPassword(context.Context, primitive.ObjectID, string) error

	SetActivationToken(ctx context.Context, email, hash string, expires time.Time) error
	FindByActivationHash(ctx context.Context, hash string) (*domain.User, error)
	ActivateUserByEmail(ctx context.Context, email string) error
	ExistsByIDAndRole(ctx context.Context, id primitive.ObjectID, role domain.Role) (bool, error)
}

type UserFilter struct {
	Name      string
	Email     string
	Roles     []string
	Gender    string
	Page      int
	Limit     int
	Offset    int
	SortOrder string
}

func NewUserRepository(db *mongo.Database) *userRepository {
	return &userRepository{
		col: db.Collection("users"),
	}
}

func (r *userRepository) Create(ctx context.Context, u *domain.User) (*domain.User, error) {
	u.CreatedAt = time.Now().UTC()
	u.UpdatedAt = time.Now().UTC()

	result, err := r.col.InsertOne(ctx, u)
	if err != nil {
		return nil, err
	}

	u.ID = result.InsertedID.(primitive.ObjectID)
	return u, nil
}

func (r *userRepository) FindAll(ctx context.Context, f UserFilter) ([]domain.User, error) {
	bsonFilter := bson.M{}
	opts := options.Find()

	if f.Name != "" {
		bsonFilter["name"] = bson.M{"$regex": f.Name, "$options": "i"}
	}
	if f.Email != "" {
		bsonFilter["email"] = bson.M{"$regex": f.Email, "$options": "i"}
	}
	if len(f.Roles) > 0 {
		bsonFilter["role"] = bson.M{"$in": f.Roles}
	}
	if f.Gender != "" {
		bsonFilter["gender"] = f.Gender
	}

	if f.Limit > 0 {
		opts.SetLimit(int64(f.Limit))
	}
	opts.SetSkip(int64(f.Offset))

	// Sort
	switch f.SortOrder {
	case "asc":
		opts.SetSort(bson.D{{Key: "createdAt", Value: 1}})
	case "desc":
		opts.SetSort(bson.D{{Key: "createdAt", Value: -1}})
	default:
		opts.SetSort(bson.D{{Key: "createdAt", Value: 1}})
	}

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []domain.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, err
	}

	return users, nil
}

func (r *userRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.User, error) {
	var u domain.User
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) SetResetToken(ctx context.Context, email, token string, expires time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"email": email}, bson.M{
		"$set": bson.M{
			"resetToken":       token,
			"resetTokenExpiry": expires,
			"updatedAt":        time.Now().UTC(),
		},
	})
	return err
}

func (r *userRepository) FindByResetToken(ctx context.Context, tokenHash string) (*domain.User, error) {
	var u domain.User
	filter := bson.M{
		"resetToken":       tokenHash,
		"resetTokenExpiry": bson.M{"$gt": time.Now()},
	}
	err := r.col.FindOne(ctx, filter).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) ResetPassword(ctx context.Context, id primitive.ObjectID, hashed string) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"password":  hashed,
			"updatedAt": time.Now().UTC(),
		},
		"$unset": bson.M{
			"resetToken":       "",
			"resetTokenExpiry": "",
		},
	})
	return err
}

func (r *userRepository) SetActivationToken(ctx context.Context, email, hash string, expires time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"email": email}, bson.M{
		"$set": bson.M{
			"activationTokenHash":   hash,
			"activationTokenExpiry": expires,
			"updatedAt":             time.Now().UTC(),
		},
	})
	return err
}

func (r *userRepository) FindByActivationHash(ctx context.Context, hash string) (*domain.User, error) {
	var u domain.User
	filter := bson.M{
		"activationTokenHash":   hash,
		"activationTokenExpiry": bson.M{"$gt": time.Now()},
	}
	err := r.col.FindOne(ctx, filter).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) ActivateUserByEmail(ctx context.Context, email string) error {
	_, err := r.col.UpdateOne(ctx,
		bson.M{"email": email},
		bson.M{
			"$set": bson.M{
				"isActive":  true,
				"updatedAt": time.Now().UTC(),
			},
			"$unset": bson.M{
				"activationTokenHash":   "",
				"activationTokenExpiry": "",
			},
		},
	)
	return err
}

func (r *userRepository) ExistsByIDAndRole(ctx context.Context, id primitive.ObjectID, role domain.Role) (bool, error) {
	var u domain.User
	filter := bson.M{"_id": id, "role": role}
	err := r.col.FindOne(ctx, filter).Decode(&u)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
