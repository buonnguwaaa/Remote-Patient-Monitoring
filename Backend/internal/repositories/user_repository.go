package repositories

import (
	"context"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type userRepository struct {
	col *mongo.Collection
}

type UserRepository interface {
	Create(context.Context, *users.User) (*users.User, error)
	FindByID(context.Context, primitive.ObjectID) (*users.User, error)
	FindByEmail(context.Context, string) (*users.User, error)
	UpdateActivation(context.Context, string, bool) error
	SetResetToken(context.Context, string, string, time.Time) error
	FindByResetToken(context.Context, string) (*users.User, error)
	UpdatePassword(context.Context, primitive.ObjectID, string) error

	SetActivationToken(ctx context.Context, email, hash string, expires time.Time) error
	FindByActivationHash(ctx context.Context, hash string) (*users.User, error)
	ClearActivationToken(ctx context.Context, id primitive.ObjectID) error
}

func NewUserRepository(db *mongo.Database) *userRepository {
	return &userRepository{
		col: db.Collection("users"),
	}
}

func (r *userRepository) Create(ctx context.Context, u *users.User) (*users.User, error) {
	u.CreatedAt = time.Now().UTC()
	u.UpdatedAt = time.Now().UTC()

	result, err := r.col.InsertOne(ctx, u)
	if err != nil {
		return nil, err
	}

	u.ID = result.InsertedID.(primitive.ObjectID)
	return u, nil
}

func (r *userRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*users.User, error) {
	var u users.User
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*users.User, error) {
	var u users.User
	err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) UpdateActivation(ctx context.Context, email string, active bool) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"isActive": active, "updatedAt": time.Now().UTC()}})
	return err
}

func (r *userRepository) SetResetToken(ctx context.Context, email, token string, expires time.Time) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"email": email}, bson.M{"$set": bson.M{"resetToken": token, "resetExpires": expires}})
	return err
}

func (r *userRepository) FindByResetToken(ctx context.Context, tokenHash string) (*users.User, error) {
	var u users.User
	filter := bson.M{
		"resetToken":   tokenHash,
		"resetExpires": bson.M{"$gt": time.Now()},
	}
	err := r.col.FindOne(ctx, filter).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, id primitive.ObjectID, hashed string) error {
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"password": hashed, "resetToken": "", "resetExpires": time.Time{}, "updatedAt": time.Now().UTC()}})
	return err
}

func (r *userRepository) SetActivationToken(ctx context.Context, email, hash string, expires time.Time) error {
	_, err := r.col.UpdateOne(ctx,
		bson.M{"email": email},
		bson.M{"$set": bson.M{
			"activationTokenHash": hash,
			"activationExpires":   expires,
			"updatedAt":           time.Now().UTC(),
		}},
	)
	return err
}

func (r *userRepository) FindByActivationHash(ctx context.Context, hash string) (*users.User, error) {
	var u users.User
	filter := bson.M{
		"activationTokenHash": hash,
		"activationExpires":   bson.M{"$gt": time.Now()},
	}
	err := r.col.FindOne(ctx, filter).Decode(&u)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *userRepository) ClearActivationToken(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.col.UpdateOne(ctx,
		bson.M{"_id": id},
		bson.M{"$unset": bson.M{
			"activationTokenHash": "",
			"activationExpires":   "",
		}},
	)
	return err
}