package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type cachedFollowUpAppointmentRepository struct {
	next  FollowUpAppointmentRepository
	store *cache.Store
	ttl   time.Duration
}

func NewCachedFollowUpAppointmentRepository(repo FollowUpAppointmentRepository, store *cache.Store, ttl time.Duration) FollowUpAppointmentRepository {
	return &cachedFollowUpAppointmentRepository{next: repo, store: store, ttl: ttl}
}

func appointmentByIDCacheKey(id primitive.ObjectID) string {
	return "appointment:id:" + id.Hex()
}

func (r *cachedFollowUpAppointmentRepository) Create(ctx context.Context, appointment *domain.FollowUpAppointment) (*domain.FollowUpAppointment, error) {
	return r.next.Create(ctx, appointment)
}

func (r *cachedFollowUpAppointmentRepository) FindWithFilter(ctx context.Context, filter FollowUpAppointmentFilter) ([]domain.FollowUpAppointment, error) {
	return r.next.FindWithFilter(ctx, filter)
}

func (r *cachedFollowUpAppointmentRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.FollowUpAppointment, error) {
	key := appointmentByIDCacheKey(id)

	var cached domain.FollowUpAppointment
	if err := r.store.Get(ctx, key, &cached); err == nil {
		return &cached, nil
	}

	appointment, err := r.next.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if appointment == nil {
		return nil, nil
	}

	if err := r.store.Set(ctx, key, appointment, r.ttl); err != nil {
		log.Printf("[WARN] failed to cache appointment %s: %v", id.Hex(), err)
	}

	return appointment, nil
}

func (r *cachedFollowUpAppointmentRepository) HasScheduledConflict(
	ctx context.Context,
	doctorID primitive.ObjectID,
	scheduledAt time.Time,
	durationMinutes int,
	excludeID *primitive.ObjectID,
) (bool, error) {
	return r.next.HasScheduledConflict(ctx, doctorID, scheduledAt, durationMinutes, excludeID)
}

func (r *cachedFollowUpAppointmentRepository) Update(ctx context.Context, appointment *domain.FollowUpAppointment) (*domain.FollowUpAppointment, error) {
	updated, err := r.next.Update(ctx, appointment)
	if err != nil {
		return nil, err
	}
	r.invalidate(ctx, appointment.ID)
	return updated, nil
}

func (r *cachedFollowUpAppointmentRepository) UpdateStatusByID(ctx context.Context, id primitive.ObjectID, status domain.FollowUpAppointmentStatus) (*domain.FollowUpAppointment, error) {
	updated, err := r.next.UpdateStatusByID(ctx, id, status)
	if err != nil {
		return nil, err
	}
	r.invalidate(ctx, id)
	return updated, nil
}

func (r *cachedFollowUpAppointmentRepository) invalidate(ctx context.Context, id primitive.ObjectID) {
	if err := r.store.Delete(ctx, appointmentByIDCacheKey(id)); err != nil {
		log.Printf("[WARN] failed to invalidate appointment cache %s: %v", id.Hex(), err)
	}
}
