package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedThresholdRepository decorates a ThresholdRepository with a Redis
// cache-aside layer for FindLatestActiveByPatientIDs, which is the hot path
// used to evaluate every incoming measurement against a patient's active
// threshold. Writes go straight through and invalidate the affected entry.
type cachedThresholdRepository struct {
	next  ThresholdRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedThresholdRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to repo
// unchanged, so this can be wired unconditionally.
func NewCachedThresholdRepository(repo ThresholdRepository, store *cache.Store, ttl time.Duration) ThresholdRepository {
	return &cachedThresholdRepository{next: repo, store: store, ttl: ttl}
}

func thresholdLatestActiveCacheKey(patientID primitive.ObjectID) string {
	return "threshold:latest-active:" + patientID.Hex()
}

func (r *cachedThresholdRepository) Create(ctx context.Context, t *domain.Threshold) (*domain.Threshold, error) {
	created, err := r.next.Create(ctx, t)
	if err != nil {
		return nil, err
	}
	r.invalidate(ctx, created.PatientID)
	return created, nil
}

func (r *cachedThresholdRepository) FindWithFilter(ctx context.Context, filter ThresholdFilter) ([]domain.Threshold, error) {
	return r.next.FindWithFilter(ctx, filter)
}

func (r *cachedThresholdRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.Threshold, error) {
	return r.next.FindByID(ctx, id)
}

// FindLatestActiveByPatientIDs serves each patient's active threshold from
// the cache when present, and only queries MongoDB for the patients that
// missed, backfilling the cache with what it finds.
func (r *cachedThresholdRepository) FindLatestActiveByPatientIDs(ctx context.Context, patientIDs []primitive.ObjectID) (map[primitive.ObjectID]*domain.Threshold, error) {
	result := make(map[primitive.ObjectID]*domain.Threshold, len(patientIDs))
	if len(patientIDs) == 0 {
		return result, nil
	}

	missing := make([]primitive.ObjectID, 0, len(patientIDs))
	for _, pid := range patientIDs {
		var cached domain.Threshold
		if err := r.store.Get(ctx, thresholdLatestActiveCacheKey(pid), &cached); err == nil {
			result[pid] = &cached
			continue
		}
		missing = append(missing, pid)
	}

	if len(missing) == 0 {
		return result, nil
	}

	fetched, err := r.next.FindLatestActiveByPatientIDs(ctx, missing)
	if err != nil {
		return nil, err
	}

	for _, pid := range missing {
		t, ok := fetched[pid]
		if !ok {
			continue
		}
		result[pid] = t
		if err := r.store.Set(ctx, thresholdLatestActiveCacheKey(pid), t, r.ttl); err != nil {
			log.Printf("[WARN] failed to cache threshold for patient %s: %v", pid.Hex(), err)
		}
	}

	return result, nil
}

func (r *cachedThresholdRepository) Update(ctx context.Context, t *domain.Threshold) (*domain.Threshold, error) {
	updated, err := r.next.Update(ctx, t)
	if err != nil {
		return nil, err
	}
	r.invalidate(ctx, updated.PatientID)
	return updated, nil
}

func (r *cachedThresholdRepository) invalidate(ctx context.Context, patientID primitive.ObjectID) {
	if err := r.store.Delete(ctx, thresholdLatestActiveCacheKey(patientID)); err != nil {
		log.Printf("[WARN] failed to invalidate threshold cache for patient %s: %v", patientID.Hex(), err)
	}
}
