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
