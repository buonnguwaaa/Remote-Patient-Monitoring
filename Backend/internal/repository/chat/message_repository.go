package chat

import (
	"context"
	"time"

	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MessageRepository interface {
	Create(ctx context.Context, message *chatDomain.Message) (*chatDomain.Message, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*chatDomain.Message, error)
	FindWithFilter(ctx context.Context, filter MessageFilter) ([]*chatDomain.Message, error)
	FindByConversationID(ctx context.Context, conversationID primitive.ObjectID, limit int) ([]*chatDomain.Message, error)
	FindLatestByConversationID(ctx context.Context, conversationID primitive.ObjectID) (*chatDomain.Message, error)
	EnsureIndexes(ctx context.Context) error
}

type MessageFilter struct {
	ConversationID primitive.ObjectID
	SenderID       primitive.ObjectID
	RelatedAlertID *primitive.ObjectID
	Cursor         primitive.ObjectID
	IsLatest       bool
	Limit          int
	FetchOneExtra  bool
}

type messageRepository struct {
	col *mongo.Collection
}

func NewMessageRepository(db *mongo.Database) MessageRepository {
	return &messageRepository{
		col: db.Collection("messages"),
	}
}

func (r *messageRepository) Create(ctx context.Context, message *chatDomain.Message) (*chatDomain.Message, error) {
	message.CreatedAt = time.Now().UTC()

	result, err := r.col.InsertOne(ctx, message)
	if err != nil {
		return nil, err
	}

	message.ID = result.InsertedID.(primitive.ObjectID)
	return message, nil
}

func (r *messageRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*chatDomain.Message, error) {
	var message chatDomain.Message
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&message)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &message, nil
}

func (r *messageRepository) FindByConversationID(ctx context.Context, conversationID primitive.ObjectID, limit int) ([]*chatDomain.Message, error) {
	return r.FindWithFilter(ctx, MessageFilter{
		ConversationID: conversationID,
		Limit:          limit,
	})
}

func (r *messageRepository) FindWithFilter(ctx context.Context, filter MessageFilter) ([]*chatDomain.Message, error) {
	bsonFilter := bson.M{}

	if !filter.ConversationID.IsZero() {
		bsonFilter["conversationId"] = filter.ConversationID
	}
	if !filter.SenderID.IsZero() {
		bsonFilter["senderId"] = filter.SenderID
	}
	if filter.RelatedAlertID != nil {
		bsonFilter["relatedAlertId"] = *filter.RelatedAlertID
	}
	if !filter.Cursor.IsZero() {
		// Cursor points to the oldest item the client has; fetch older items only.
		bsonFilter["_id"] = bson.M{"$lt": filter.Cursor}
	}

	if filter.IsLatest {
		opts := options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})
		var latest chatDomain.Message

		err := r.col.FindOne(ctx, bsonFilter, opts).Decode(&latest)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				return []*chatDomain.Message{}, nil
			}
			return nil, err
		}

		return []*chatDomain.Message{&latest}, nil
	}

	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}, {Key: "_id", Value: -1}})

	effectiveLimit := filter.Limit
	if filter.FetchOneExtra && effectiveLimit > 0 {
		effectiveLimit++
	}

	if effectiveLimit > 0 {
		opts.SetLimit(int64(effectiveLimit))
	}

	cursor, err := r.col.Find(ctx, bsonFilter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []*chatDomain.Message
	if err := cursor.All(ctx, &messages); err != nil {
		return nil, err
	}

	return messages, nil
}

func (r *messageRepository) FindLatestByConversationID(ctx context.Context, conversationID primitive.ObjectID) (*chatDomain.Message, error) {
	messages, err := r.FindWithFilter(ctx, MessageFilter{
		ConversationID: conversationID,
		IsLatest:       true,
	})
	if err != nil {
		return nil, err
	}
	if len(messages) == 0 {
		return nil, nil
	}

	return messages[0], nil
}

func (r *messageRepository) EnsureIndexes(ctx context.Context) error {
	_, err := r.col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "conversationId", Value: 1}, {Key: "createdAt", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "senderId", Value: 1}},
		},
		{
			Keys:    bson.D{{Key: "relatedAlertId", Value: 1}},
			Options: options.Index().SetSparse(true),
		},
	})
	return err
}
