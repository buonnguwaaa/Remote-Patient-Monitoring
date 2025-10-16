
package repository

import (
	"context"
	"time"
	"RPM-Backend/internal/api/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var refreshTokenCollection *mongo.Collection

// Khởi tạo collection, gọi từ main.go
func InitRefreshTokenCollection(db *mongo.Database) {
	refreshTokenCollection = db.Collection("refresh_tokens")
}

func SaveRefreshToken(ctx context.Context, token *model.RefreshToken) error {
	_, err := refreshTokenCollection.InsertOne(ctx, token)
	return err
}

func FindRefreshToken(ctx context.Context, token string) (*model.RefreshToken, error) {
	var result model.RefreshToken
	err := refreshTokenCollection.FindOne(ctx, bson.M{"token": token}).Decode(&result)
	return &result, err
}

func DeleteRefreshToken(ctx context.Context, token string) error {
	_, err := refreshTokenCollection.DeleteOne(ctx, bson.M{"token": token})
	return err
}

// DeleteExpiredRefreshTokens removes expired refresh tokens (scheduled task)
func DeleteExpiredRefreshTokens(ctx context.Context) (int64, error) {
	res, err := refreshTokenCollection.DeleteMany(ctx, bson.M{"expires_at": bson.M{"$lt": time.Now()}})
	if err != nil {
		return 0, err
	}
	return res.DeletedCount, nil
}

// Xóa tất cả refresh token của user (dùng cho single device/session)
func DeleteRefreshTokensByUserID(ctx context.Context, userID interface{}) error {
	_, err := refreshTokenCollection.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}