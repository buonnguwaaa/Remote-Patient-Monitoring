package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedAlertEntry is the JSON shape stored in Redis for a single alert
// lookup, bundling the joined user data alongside the alert itself.
type cachedAlertEntry struct {
	Alert    *domain.Alert  `json:"alert"`
	UserData *AlertUserData `json:"userData"`
}

// cachedAlertRepository decorates an AlertRepository with a Redis
// cache-aside layer for FindAlertByID (single-entity, read-heavy lookup used
// by alert detail views and acknowledgement flows). Any write that can
// change an alert invalidates its cached entry.
type cachedAlertRepository struct {
	next  AlertRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedAlertRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to
// repo unchanged, so this can be wired unconditionally.
func NewCachedAlertRepository(repo AlertRepository, store *cache.Store, ttl time.Duration) AlertRepository {
	return &cachedAlertRepository{next: repo, store: store, ttl: ttl}
}

func alertByIDCacheKey(id primitive.ObjectID) string {
	return "alert:id:" + id.Hex()
}

func (r *cachedAlertRepository) Create(ctx context.Context, a *domain.Alert) (*domain.Alert, error) {
	return r.next.Create(ctx, a)
}

func (r *cachedAlertRepository) FindWithFilter(ctx context.Context, filter AlertFilter) ([]*domain.Alert, map[primitive.ObjectID]*AlertUserData, error) {
	return r.next.FindWithFilter(ctx, filter)
}

func (r *cachedAlertRepository) FindAlertByID(ctx context.Context, id primitive.ObjectID) (*domain.Alert, *AlertUserData, error) {
	key := alertByIDCacheKey(id)

	var cached cachedAlertEntry
	if err := r.store.Get(ctx, key, &cached); err == nil {
		return cached.Alert, cached.UserData, nil
	}

	alert, userData, err := r.next.FindAlertByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if alert == nil {
		return nil, nil, nil
	}

	entry := cachedAlertEntry{Alert: alert, UserData: userData}
	if err := r.store.Set(ctx, key, entry, r.ttl); err != nil {
		log.Printf("[WARN] failed to cache alert %s: %v", id.Hex(), err)
	}

	return alert, userData, nil
}

func (r *cachedAlertRepository) FindByMeasurementID(ctx context.Context, measurementID primitive.ObjectID) (*domain.Alert, error) {
	return r.next.FindByMeasurementID(ctx, measurementID)
}

func (r *cachedAlertRepository) UpdateAcknowledgementByID(ctx context.Context, id primitive.ObjectID, acknowledgedBy primitive.ObjectID) (*domain.Alert, *AlertUserData, error) {
	alert, userData, err := r.next.UpdateAcknowledgementByID(ctx, id, acknowledgedBy)
	if err != nil {
		return nil, nil, err
	}

	if err := r.store.Delete(ctx, alertByIDCacheKey(id)); err != nil {
		log.Printf("[WARN] failed to invalidate alert cache %s: %v", id.Hex(), err)
	}

	return alert, userData, nil
}
