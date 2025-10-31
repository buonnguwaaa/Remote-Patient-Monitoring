package repositories

import (
	"context"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/refresh_tokens"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"time"
)

type TokenRepository interface {
	Save(ctx context.Context, userIDHex string, tokenHash string, expiresAt time.Time) error
	IsValid(ctx context.Context, userIDHex string, tokenHash string) (bool, error)
	RevokeToken(ctx context.Context, userIDHex string, tokenHash string) error
}

type tokenRepository struct {
	col *mongo.Collection
}

func NewTokenRepository(db *mongo.Database) TokenRepository {
	return &tokenRepository{col: db.Collection("refresh_tokens")}
}

func (r *tokenRepository) Save(ctx context.Context, userIDHex string, tokenHash string, expiresAt time.Time) error {
	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		return err
	}
	token := &refresh_tokens.RefreshToken{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now().UTC(),
	}
	_, err = r.col.InsertOne(ctx, token)
	return err
}

func (r *tokenRepository) IsValid(ctx context.Context, userIDHex string, tokenHash string) (bool, error) {
	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		return false, err
	}
	filter := bson.M{
		"userId":    userID,
		"tokenHash": tokenHash,
		"revokedAt": bson.M{"$exists": false},
		"expiresAt": bson.M{"$gt": time.Now()},
	}
	err = r.col.FindOne(ctx, filter).Err()
	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	return err == nil, err
}

func (r *tokenRepository) RevokeToken(ctx context.Context, userIDHex string, tokenHash string) error {
	userID, err := primitive.ObjectIDFromHex(userIDHex)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	_, err = r.col.UpdateOne(ctx,
		bson.M{"userId": userID, "tokenHash": tokenHash, "revokedAt": bson.M{"$exists": false}},
		bson.M{"$set": bson.M{"revokedAt": &now}},
	)
	return err
}
