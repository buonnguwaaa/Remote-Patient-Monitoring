package seed

import (
	"context"
	"fmt"
	"math"
	"time"

	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func fp(v float64) *float64 {
	return &v
}

func ip(v int) *int {
	return &v
}

// round1 rounds to one decimal place (e.g. 88.333 → 88.3).
func round1(v float64) float64 {
	return math.Round(v*10) / 10
}

func seedEmail(role string, index int) string {
	if index == 0 {
		switch role {
		case "admin":
			return adminEmail
		case "doctor":
			return doctorEmail
		case "patient":
			return patientEmail
		case "nurse":
			return nurseEmail
		}
	}
	return fmt.Sprintf("seed-%s-%02d@%s", role, index+1, seedDomain)
}

func seedGender(index int) userDomain.Gender {
	if index%3 == 0 {
		return userDomain.GenderMale
	}
	if index%3 == 1 {
		return userDomain.GenderFemale
	}
	return userDomain.GenderOther
}

func seedDob(index int, baseYear int) time.Time {
	return time.Date(baseYear-(index%30), time.Month((index%12)+1), (index%28)+1, 0, 0, 0, 0, time.UTC)
}

func pick[T any](items []T, index int) T {
	return items[index%len(items)]
}

// calculateMAP mirrors measurementService.calculateMAP so seeded blood
// pressure readings carry a MAP consistent with their systolic/diastolic
// values instead of an unrelated hardcoded number.
func calculateMAP(systolic, diastolic float64) float64 {
	return (systolic + 2*diastolic) / 3
}

// seedPersonName builds a realistic Vietnamese full name in the
// conventional "Họ" + "Tên đệm" + "Tên" (surname + middle name + given
// name) order, e.g. "Nguyễn Văn An". salt offsets the lookup index so
// different roles don't end up producing the same name for the same
// loop index.
func seedPersonName(index, salt int) string {
	i := index + salt

	middleNames, givenNames := neutralMiddleNames, neutralGivenNames
	switch seedGender(index) {
	case userDomain.GenderMale:
		middleNames, givenNames = maleMiddleNames, maleGivenNames
	case userDomain.GenderFemale:
		middleNames, givenNames = femaleMiddleNames, femaleGivenNames
	}

	return fmt.Sprintf("%s %s %s", pick(vietnameseSurnames, i), pick(middleNames, i), pick(givenNames, i))
}

// accountCreatedAt returns a deterministic "account created" timestamp, far
// enough in the past (120-169 days ago) to comfortably predate every other
// piece of seeded history tied to that account (measurements go back at most
// 90 days, prescriptions/reminders/conversations less than that).
func accountCreatedAt(index int) time.Time {
	return time.Now().UTC().AddDate(0, 0, -(120 + index))
}

// daysAgoWithin returns a timestamp between 1 and maxDays days before now,
// deterministically varied by index. Used for data whose real-world
// counterpart depends on a background job (Temporal) that seeding doesn't
// start, so it must never look like a still-pending future event.
func daysAgoWithin(index, maxDays int) time.Time {
	offset := index%maxDays + 1
	return time.Now().UTC().Add(-time.Duration(offset) * 24 * time.Hour)
}

// backdateCreatedAt overwrites the createdAt/updatedAt fields that a
// repository's Create just hard-coded to time.Now() (e.g.
// measurement_repository.go, alert_repository.go, and effectively every
// other repository this seeder writes through) with the historical
// timestamp the record's own domain fields (TakenAt, StartDate,
// ScheduledAt, ...) claim it actually happened at. Without this, every
// seeded document looks like it was created the instant the seed command
// ran, no matter how "past" its other date fields are. The repositories are
// intentionally left untouched; this patches the timestamp back in
// afterwards with a direct, targeted collection write.
func (s *Seeder) backdateCreatedAt(ctx context.Context, collection string, id primitive.ObjectID, at time.Time) error {
	return s.setTimestampFields(ctx, collection, id, bson.M{"createdAt": at.UTC(), "updatedAt": at.UTC()})
}

// backdateCreatedAtOnly is like backdateCreatedAt but for collections whose
// domain struct has no updatedAt field (e.g. activity logs, chat messages,
// medication intakes).
func (s *Seeder) backdateCreatedAtOnly(ctx context.Context, collection string, id primitive.ObjectID, at time.Time) error {
	return s.setTimestampFields(ctx, collection, id, bson.M{"createdAt": at.UTC()})
}

func (s *Seeder) setTimestampFields(ctx context.Context, collection string, id primitive.ObjectID, fields bson.M) error {
	_, err := s.db.Collection(collection).UpdateByID(ctx, id, bson.M{"$set": fields})
	return err
}
