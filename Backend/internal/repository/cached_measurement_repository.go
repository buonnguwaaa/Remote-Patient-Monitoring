package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedMeasurementRepository decorates a MeasurementRepository with a Redis
// cache-aside layer for FindLatestByPatientIDs, the batch lookup the patient
// overview dashboard uses to show each patient's most recent reading. It
// embeds the underlying repository so every other method (Create, Update,
// FindWithFilter, FindByID) passes through untouched unless overridden below.
type cachedMeasurementRepository struct {
	MeasurementRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedMeasurementRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to repo
// unchanged, so this can be wired unconditionally.
func NewCachedMeasurementRepository(repo MeasurementRepository, store *cache.Store, ttl time.Duration) MeasurementRepository {
	return &cachedMeasurementRepository{MeasurementRepository: repo, store: store, ttl: ttl}
}

func measurementLatestCacheKey(patientID primitive.ObjectID) string {
	return "measurement:latest:" + patientID.Hex()
}

func (r *cachedMeasurementRepository) Create(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error) {
	created, err := r.MeasurementRepository.Create(ctx, m)
	if err != nil {
		return nil, err
	}
	r.invalidate(ctx, created.PatientID)
	return created, nil
}

func (r *cachedMeasurementRepository) Update(ctx context.Context, m *domain.Measurement) (*domain.Measurement, error) {
	updated, err := r.MeasurementRepository.Update(ctx, m)
	if err != nil {
		return nil, err
	}
	r.invalidate(ctx, updated.PatientID)
	return updated, nil
}

// FindLatestByPatientIDs serves each patient's latest measurement from the
// cache when present, and only queries MongoDB for the patients that
// missed, backfilling the cache with what it finds.
func (r *cachedMeasurementRepository) FindLatestByPatientIDs(ctx context.Context, patientIDs []primitive.ObjectID) (map[primitive.ObjectID]*domain.Measurement, error) {
	result := make(map[primitive.ObjectID]*domain.Measurement, len(patientIDs))
	if len(patientIDs) == 0 {
		return result, nil
	}

	missing := make([]primitive.ObjectID, 0, len(patientIDs))
	for _, pid := range patientIDs {
		var cached domain.Measurement
		if err := r.store.Get(ctx, measurementLatestCacheKey(pid), &cached); err == nil {
			result[pid] = &cached
			continue
		}
		missing = append(missing, pid)
	}

	if len(missing) == 0 {
		return result, nil
	}

	fetched, err := r.MeasurementRepository.FindLatestByPatientIDs(ctx, missing)
	if err != nil {
		return nil, err
	}

	for _, pid := range missing {
		m, ok := fetched[pid]
		if !ok {
			continue
		}
		result[pid] = m
		if err := r.store.Set(ctx, measurementLatestCacheKey(pid), m, r.ttl); err != nil {
			log.Printf("[WARN] failed to cache latest measurement for patient %s: %v", pid.Hex(), err)
		}
	}

	return result, nil
}

func (r *cachedMeasurementRepository) invalidate(ctx context.Context, patientID primitive.ObjectID) {
	if err := r.store.Delete(ctx, measurementLatestCacheKey(patientID)); err != nil {
		log.Printf("[WARN] failed to invalidate measurement cache for patient %s: %v", patientID.Hex(), err)
	}
}
