package repository

import (
	"context"
	"fmt"
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// UserCascadeRepository removes related documents when an admin hard-deletes a user.
type UserCascadeRepository interface {
	// CascadePatient deletes clinical + operational data owned by the patient.
	CascadePatient(ctx context.Context, patientID primitive.ObjectID) error
	// CascadeStaff clears assignment links and deletes staff-owned operational data
	// without touching patient clinical records.
	CascadeStaff(ctx context.Context, staffID primitive.ObjectID, role userDomain.Role) error
	// CascadeAccount deletes auth/notification/chat/activity data for any role
	// (used for admin and as the shared tail of staff cascade).
	CascadeAccount(ctx context.Context, userID primitive.ObjectID) error
}

type userCascadeRepository struct {
	db *mongo.Database
}

func NewUserCascadeRepository(db *mongo.Database) UserCascadeRepository {
	return &userCascadeRepository{db: db}
}

func (r *userCascadeRepository) CascadePatient(ctx context.Context, patientID primitive.ObjectID) error {
	if err := r.deleteConversationsForUser(ctx, patientID); err != nil {
		return err
	}

	specs := []struct {
		col    string
		filter bson.M
	}{
		{"assignments", bson.M{"patientId": patientID}},
		{"thresholds", bson.M{"patientId": patientID}},
		{"measurements", bson.M{"patientId": patientID}},
		{"alerts", bson.M{"patientId": patientID}},
		{"prescriptions", bson.M{"patientId": patientID}},
		{"medication_intakes", bson.M{"patientId": patientID}},
		{"reminders", bson.M{"patientId": patientID}},
		{"follow_up_appointments", bson.M{"patientId": patientID}},
		{"video_sessions", bson.M{"patientId": patientID}},
		{"activity_logs", bson.M{"$or": []bson.M{{"patientId": patientID}, {"userId": patientID}}}},
		{"notifications", bson.M{"userId": patientID}},
		{"notification_tokens", bson.M{"userId": patientID}},
		{"refresh_tokens", bson.M{"userId": patientID}},
	}

	for _, s := range specs {
		if _, err := r.db.Collection(s.col).DeleteMany(ctx, s.filter); err != nil {
			return fmt.Errorf("cascade patient delete %s: %w", s.col, err)
		}
	}
	return nil
}

func (r *userCascadeRepository) CascadeStaff(ctx context.Context, staffID primitive.ObjectID, role userDomain.Role) error {
	switch role {
	case userDomain.RoleDoctor:
		if err := r.clearAssignee(ctx, "doctorId", staffID); err != nil {
			return err
		}
		if _, err := r.db.Collection("video_sessions").DeleteMany(ctx, bson.M{"doctorId": staffID}); err != nil {
			return fmt.Errorf("cascade staff delete video_sessions: %w", err)
		}
	case userDomain.RoleNurse:
		if err := r.clearAssignee(ctx, "nurseId", staffID); err != nil {
			return err
		}
	default:
		return fmt.Errorf("cascade staff: unsupported role %s", role)
	}
	return r.CascadeAccount(ctx, staffID)
}

func (r *userCascadeRepository) CascadeAccount(ctx context.Context, userID primitive.ObjectID) error {
	if err := r.deleteConversationsForUser(ctx, userID); err != nil {
		return err
	}

	specs := []struct {
		col    string
		filter bson.M
	}{
		{"activity_logs", bson.M{"userId": userID}},
		{"notifications", bson.M{"userId": userID}},
		{"notification_tokens", bson.M{"userId": userID}},
		{"refresh_tokens", bson.M{"userId": userID}},
	}
	for _, s := range specs {
		if _, err := r.db.Collection(s.col).DeleteMany(ctx, s.filter); err != nil {
			return fmt.Errorf("cascade account delete %s: %w", s.col, err)
		}
	}
	return nil
}

func (r *userCascadeRepository) clearAssignee(ctx context.Context, field string, staffID primitive.ObjectID) error {
	now := time.Now().UTC()
	if _, err := r.db.Collection("assignments").UpdateMany(
		ctx,
		bson.M{field: staffID},
		bson.M{
			"$unset": bson.M{field: ""},
			"$set":   bson.M{"updatedAt": now},
		},
	); err != nil {
		return fmt.Errorf("cascade clear assignment %s: %w", field, err)
	}

	// Drop rows that no longer have any care-team member.
	if _, err := r.db.Collection("assignments").DeleteMany(ctx, bson.M{
		"$and": []bson.M{
			{"$or": []bson.M{
				{"doctorId": bson.M{"$exists": false}},
				{"doctorId": primitive.NilObjectID},
			}},
			{"$or": []bson.M{
				{"nurseId": bson.M{"$exists": false}},
				{"nurseId": primitive.NilObjectID},
			}},
		},
	}); err != nil {
		return fmt.Errorf("cascade delete empty assignments: %w", err)
	}
	return nil
}

func (r *userCascadeRepository) deleteConversationsForUser(ctx context.Context, userID primitive.ObjectID) error {
	convCur, err := r.db.Collection("conversations").Find(ctx, bson.M{
		"participants.userId": userID,
	}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return fmt.Errorf("cascade find conversations: %w", err)
	}
	defer convCur.Close(ctx)

	var convIDs []primitive.ObjectID
	for convCur.Next(ctx) {
		var doc struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := convCur.Decode(&doc); err != nil {
			return fmt.Errorf("cascade decode conversation: %w", err)
		}
		convIDs = append(convIDs, doc.ID)
	}
	if err := convCur.Err(); err != nil {
		return fmt.Errorf("cascade conversations cursor: %w", err)
	}
	if len(convIDs) == 0 {
		return nil
	}

	if _, err := r.db.Collection("messages").DeleteMany(ctx, bson.M{"conversationId": bson.M{"$in": convIDs}}); err != nil {
		return fmt.Errorf("cascade delete messages: %w", err)
	}
	if _, err := r.db.Collection("conversations").DeleteMany(ctx, bson.M{"_id": bson.M{"$in": convIDs}}); err != nil {
		return fmt.Errorf("cascade delete conversations: %w", err)
	}
	return nil
}
