package chat

import (
	"context"
	"sort"
	"strings"
	"time"

	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ConversationRepository interface {
	Create(ctx context.Context, conversation *chatDomain.Conversation) (*chatDomain.Conversation, error)
	FindByID(ctx context.Context, id primitive.ObjectID) (*chatDomain.Conversation, error)
	FindWithFilter(ctx context.Context, filter ConversationFilter) ([]*chatDomain.Conversation, error)
	FindByParticipants(ctx context.Context, participantIDs []primitive.ObjectID) (*chatDomain.Conversation, error)
	FindByParticipantID(ctx context.Context, participantID primitive.ObjectID, limit int, cursor time.Time) ([]*chatDomain.Conversation, error)
	TouchUpdatedAt(ctx context.Context, id primitive.ObjectID) error
	EnsureIndexes(ctx context.Context) error
}

type ConversationFilter struct {
	ParticipantID  primitive.ObjectID
	ParticipantIDs []primitive.ObjectID
	ExactMatch     bool
	Cursor         time.Time
	Limit          int
	FetchOneExtra  bool
}

type conversationRepository struct {
	col *mongo.Collection
}

func NewConversationRepository(db *mongo.Database) ConversationRepository {
	return &conversationRepository{
		col: db.Collection("conversations"),
	}
}

func (r *conversationRepository) Create(ctx context.Context, conversation *chatDomain.Conversation) (*chatDomain.Conversation, error) {
	now := time.Now().UTC()
	conversation.CreatedAt = now
	conversation.UpdatedAt = now
	conversation.ParticipantKey = buildParticipantKey(conversation.ParticipantIDs)

	result, err := r.col.InsertOne(ctx, conversation)
	if err != nil {
		return nil, err
	}

	conversation.ID = result.InsertedID.(primitive.ObjectID)
	return conversation, nil
}

func (r *conversationRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*chatDomain.Conversation, error) {
	var conversation chatDomain.Conversation
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&conversation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &conversation, nil
}

func (r *conversationRepository) FindByParticipants(ctx context.Context, participantIDs []primitive.ObjectID) (*chatDomain.Conversation, error) {
	if len(participantIDs) == 0 {
		return nil, nil
	}

	filter := bson.M{
		"participantIds": bson.M{
			"$all":  participantIDs,
			"$size": len(participantIDs),
		},
	}

	opts := options.FindOne().SetSort(bson.D{{Key: "updatedAt", Value: -1}, {Key: "_id", Value: -1}})

	var conversation chatDomain.Conversation
	err := r.col.FindOne(ctx, filter, opts).Decode(&conversation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &conversation, nil
}

func (r *conversationRepository) FindByParticipantID(ctx context.Context, participantID primitive.ObjectID, limit int, cursor time.Time) ([]*chatDomain.Conversation, error) {
	return r.FindWithFilter(ctx, ConversationFilter{
		ParticipantID: participantID,
		Cursor:        cursor,
		Limit:         limit,
	})
}

func (r *conversationRepository) FindWithFilter(ctx context.Context, filter ConversationFilter) ([]*chatDomain.Conversation, error) {
	bsonFilter := bson.M{}

	if !filter.ParticipantID.IsZero() {
		bsonFilter["participantIds"] = filter.ParticipantID
	}

	if len(filter.ParticipantIDs) > 0 {
		participantsFilter := bson.M{"$all": filter.ParticipantIDs}
		if filter.ExactMatch {
			participantsFilter["$size"] = len(filter.ParticipantIDs)
		}
		bsonFilter["participantIds"] = participantsFilter
	}

	if !filter.Cursor.IsZero() {
		bsonFilter["updatedAt"] = bson.M{"$lt": filter.Cursor}
	}

	opts := options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}, {Key: "_id", Value: -1}})

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

	var conversations []*chatDomain.Conversation
	if err := cursor.All(ctx, &conversations); err != nil {
		return nil, err
	}

	return conversations, nil
}

func (r *conversationRepository) TouchUpdatedAt(ctx context.Context, id primitive.ObjectID) error {
	_, err := r.col.UpdateByID(ctx, id, bson.M{
		"$set": bson.M{"updatedAt": time.Now().UTC()},
	})
	return err
}

func (r *conversationRepository) EnsureIndexes(ctx context.Context) error {
	_, err := r.col.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "participantIds", Value: 1}},
		},
		{
			Keys:    bson.D{{Key: "participantKey", Value: 1}},
			Options: options.Index().SetUnique(true).SetSparse(true),
		},
		{
			Keys: bson.D{{Key: "updatedAt", Value: -1}},
		},
	})
	return err
}

func buildParticipantKey(ids []primitive.ObjectID) string {
	if len(ids) == 0 {
		return ""
	}

	values := make([]string, 0, len(ids))
	for _, id := range ids {
		if id.IsZero() {
			continue
		}
		values = append(values, id.Hex())
	}

	if len(values) == 0 {
		return ""
	}

	sort.Strings(values)
	return strings.Join(values, "|")
}
