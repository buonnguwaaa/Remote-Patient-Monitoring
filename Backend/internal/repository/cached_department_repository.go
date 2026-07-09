package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedDepartmentRepository decorates a DepartmentRepository with a Redis
// cache-aside layer for FindAll, the master-data list backing GET
// /departments. Departments change rarely (admin CRUD only), so this is a
// safe, high-value cache with a simple, always-correct invalidation story:
// every write goes through this same repository's Create/Update/Delete.
//
// FindMembersByDepartmentID and CountMembersByDepartmentIDs are NOT cached
// here: department membership actually changes via
// StaffRepository[T].UpdateDepartmentID (a completely different
// repository/collection write path), so this repository has no reliable
// signal to invalidate those entries against. Caching them would either
// require plumbing invalidation across repositories or accepting silent
// staleness on staff reassignment - revisit if that cross-repo wiring is
// wanted later.
type cachedDepartmentRepository struct {
	DepartmentRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedDepartmentRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to
// repo unchanged, so this can be wired unconditionally.
func NewCachedDepartmentRepository(repo DepartmentRepository, store *cache.Store, ttl time.Duration) DepartmentRepository {
	return &cachedDepartmentRepository{DepartmentRepository: repo, store: store, ttl: ttl}
}

const departmentAllCacheKey = "department:all"

func (r *cachedDepartmentRepository) FindAll(ctx context.Context) ([]*domain.Department, error) {
	var cached []*domain.Department
	if err := r.store.Get(ctx, departmentAllCacheKey, &cached); err == nil {
		return cached, nil
	}

	depts, err := r.DepartmentRepository.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	if err := r.store.Set(ctx, departmentAllCacheKey, depts, r.ttl); err != nil {
		log.Printf("[WARN] failed to cache department list: %v", err)
	}

	return depts, nil
}

func (r *cachedDepartmentRepository) Create(ctx context.Context, dept *domain.Department) (*domain.Department, error) {
	created, err := r.DepartmentRepository.Create(ctx, dept)
	if err != nil {
		return nil, err
	}
	r.invalidateAll(ctx)
	return created, nil
}

func (r *cachedDepartmentRepository) Update(ctx context.Context, dept *domain.Department) (*domain.Department, error) {
	updated, err := r.DepartmentRepository.Update(ctx, dept)
	if err != nil {
		return nil, err
	}
	r.invalidateAll(ctx)
	return updated, nil
}

func (r *cachedDepartmentRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	if err := r.DepartmentRepository.Delete(ctx, id); err != nil {
		return err
	}
	r.invalidateAll(ctx)
	return nil
}

func (r *cachedDepartmentRepository) invalidateAll(ctx context.Context) {
	if err := r.store.Delete(ctx, departmentAllCacheKey); err != nil {
		log.Printf("[WARN] failed to invalidate department list cache: %v", err)
	}
}
