package repository

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type cachedAlertEntry struct {
	Alert    *domain.Alert  `json:"alert"`
	UserData *AlertUserData `json:"userData"`
}

type cachedAlertListEntry struct {
	Alerts   []*domain.Alert             `json:"alerts"`
	UserData map[string]*AlertUserData `json:"userData"`
}

type cachedAlertRepository struct {
	next           AlertRepository
	assignmentRepo AssignmentRepository
	store          *cache.Store
	ttl            time.Duration
}

func NewCachedAlertRepository(
	repo AlertRepository,
	assignmentRepo AssignmentRepository,
	store *cache.Store,
	ttl time.Duration,
) AlertRepository {
	return &cachedAlertRepository{next: repo, assignmentRepo: assignmentRepo, store: store, ttl: ttl}
}

func alertByIDCacheKey(id primitive.ObjectID) string {
	return "alert:id:" + id.Hex()
}

func doctorAlertListCacheKey(filter AlertFilter) string {
	return fmt.Sprintf(
		"alert:list:doctor:%s:patient:%s:status:%s:severity:%s:latest:%s:page:%d:limit:%d:sort:%s",
		filter.DoctorID,
		filterOrWildcard(filter.PatientID),
		filterOrWildcard(string(filter.Status)),
		filterOrWildcard(string(filter.Severity)),
		strconv.FormatBool(filter.IsLatest),
		filter.Page,
		filter.Limit,
		filterOrWildcard(filter.SortOrder),
	)
}

func doctorAlertListCachePrefix(doctorID primitive.ObjectID) string {
	return "alert:list:doctor:" + doctorID.Hex()
}

func filterOrWildcard(value string) string {
	if value == "" {
		return "_"
	}
	return value
}

func (r *cachedAlertRepository) Create(ctx context.Context, a *domain.Alert) (*domain.Alert, error) {
	created, err := r.next.Create(ctx, a)
	if err != nil {
		return nil, err
	}

	if r.assignmentRepo != nil {
		assignment, err := r.assignmentRepo.FindByPatientID(ctx, created.PatientID)
		if err == nil && assignment != nil && !assignment.DoctorID.IsZero() {
			r.invalidateDoctorLists(ctx, assignment.DoctorID)
		}
	}

	return created, nil
}

func (r *cachedAlertRepository) FindWithFilter(ctx context.Context, filter AlertFilter) ([]*domain.Alert, map[primitive.ObjectID]*AlertUserData, error) {
	if filter.DoctorID == "" || filter.NurseID != "" {
		return r.next.FindWithFilter(ctx, filter)
	}

	key := doctorAlertListCacheKey(filter)

	var cached cachedAlertListEntry
	if err := r.store.Get(ctx, key, &cached); err == nil {
		return cached.Alerts, alertUserDataFromCached(cached.UserData), nil
	}

	alerts, userData, err := r.next.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, nil, err
	}

	entry := cachedAlertListEntry{Alerts: alerts, UserData: alertUserDataToCached(userData)}
	if err := r.store.Set(ctx, key, entry, r.ttl); err != nil {
		log.Printf("[WARN] failed to cache doctor alert list %s: %v", key, err)
	}

	return alerts, userData, nil
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

	r.invalidateDoctorLists(ctx, acknowledgedBy)
	return alert, userData, nil
}

func (r *cachedAlertRepository) invalidateDoctorLists(ctx context.Context, doctorID primitive.ObjectID) {
	if err := r.store.DeleteByPrefix(ctx, doctorAlertListCachePrefix(doctorID)); err != nil {
		log.Printf("[WARN] failed to invalidate doctor alert list cache %s: %v", doctorID.Hex(), err)
	}
}

func alertUserDataToCached(userData map[primitive.ObjectID]*AlertUserData) map[string]*AlertUserData {
	if len(userData) == 0 {
		return nil
	}
	cached := make(map[string]*AlertUserData, len(userData))
	for id, data := range userData {
		cached[id.Hex()] = data
	}
	return cached
}

func alertUserDataFromCached(userData map[string]*AlertUserData) map[primitive.ObjectID]*AlertUserData {
	if len(userData) == 0 {
		return nil
	}
	result := make(map[primitive.ObjectID]*AlertUserData, len(userData))
	for idHex, data := range userData {
		id, err := primitive.ObjectIDFromHex(idHex)
		if err != nil {
			continue
		}
		result[id] = data
	}
	return result
}
