package repository

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedAssignmentRepository decorates an AssignmentRepository with a Redis
// cache-aside layer for the two "list my patients" lookups used by the
// staff dashboard and /assignments/me (FindByDoctorIDWithNames /
// FindByNurseIDWithNames).
//
// HasAssignmentRecordForPair and FindByPatientID are deliberately NOT
// cached: every call site for those is a write-path authorization check
// (e.g. "can this doctor start a chat/video call with this patient?", or
// "which doctor should this new appointment notify?"), where a stale read
// could cause an incorrect allow/deny rather than just a stale display.
type cachedAssignmentRepository struct {
	AssignmentRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedAssignmentRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to
// repo unchanged, so this can be wired unconditionally.
func NewCachedAssignmentRepository(repo AssignmentRepository, store *cache.Store, ttl time.Duration) AssignmentRepository {
	return &cachedAssignmentRepository{AssignmentRepository: repo, store: store, ttl: ttl}
}

func assignmentsByDoctorCacheKey(doctorID primitive.ObjectID) string {
	return "assignment:doctor:" + doctorID.Hex()
}

func assignmentsByNurseCacheKey(nurseID primitive.ObjectID) string {
	return "assignment:nurse:" + nurseID.Hex()
}

// cachedAssignmentList bundles an assignment list with its display-name map
// so both halves of FindByDoctor/NurseIDWithNames are cached together under
// one key.
type cachedAssignmentList struct {
	Assignments []*domain.Assignment                   `json:"assignments"`
	UserInfo    map[primitive.ObjectID]UserDisplayInfo `json:"userInfo"`
}

func (r *cachedAssignmentRepository) FindByDoctorIDWithNames(ctx context.Context, doctorID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	key := assignmentsByDoctorCacheKey(doctorID)

	var cached cachedAssignmentList
	if err := r.store.Get(ctx, key, &cached); err == nil {
		return cached.Assignments, cached.UserInfo, nil
	}

	assignments, userInfo, err := r.AssignmentRepository.FindByDoctorIDWithNames(ctx, doctorID)
	if err != nil {
		return nil, nil, err
	}

	entry := cachedAssignmentList{Assignments: assignments, UserInfo: userInfo}
	if err := r.store.Set(ctx, key, entry, r.ttl); err != nil {
		log.Printf("[WARN] failed to cache assignments for doctor %s: %v", doctorID.Hex(), err)
	}

	return assignments, userInfo, nil
}

func (r *cachedAssignmentRepository) FindByNurseIDWithNames(ctx context.Context, nurseID primitive.ObjectID) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, error) {
	key := assignmentsByNurseCacheKey(nurseID)

	var cached cachedAssignmentList
	if err := r.store.Get(ctx, key, &cached); err == nil {
		return cached.Assignments, cached.UserInfo, nil
	}

	assignments, userInfo, err := r.AssignmentRepository.FindByNurseIDWithNames(ctx, nurseID)
	if err != nil {
		return nil, nil, err
	}

	entry := cachedAssignmentList{Assignments: assignments, UserInfo: userInfo}
	if err := r.store.Set(ctx, key, entry, r.ttl); err != nil {
		log.Printf("[WARN] failed to cache assignments for nurse %s: %v", nurseID.Hex(), err)
	}

	return assignments, userInfo, nil
}

// Paginated queries are not cached — they pass through directly to the
// underlying repository to avoid cache-key explosion and stale-subset issues.
func (r *cachedAssignmentRepository) FindByDoctorIDWithNamesPaginated(ctx context.Context, doctorID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error) {
	return r.AssignmentRepository.FindByDoctorIDWithNamesPaginated(ctx, doctorID, offset, limit)
}

func (r *cachedAssignmentRepository) FindByNurseIDWithNamesPaginated(ctx context.Context, nurseID primitive.ObjectID, offset, limit int) ([]*domain.Assignment, map[primitive.ObjectID]UserDisplayInfo, int64, error) {
	return r.AssignmentRepository.FindByNurseIDWithNamesPaginated(ctx, nurseID, offset, limit)
}

// Create invalidates the new assignment's doctor/nurse list caches.
//
// Note: if this call reassigns a patient away from a previous doctor/nurse,
// that previous assignee's cached list is NOT invalidated here (the
// interface only gives us the new assignment, not what was replaced) and
// DeleteByID doesn't invalidate at all (it only receives the assignment's
// own id, not its doctor/nurse/patient). Both are rare, admin-driven
// actions, so they rely on the store's TTL to expire naturally rather than
// an extra lookup to invalidate precisely.
func (r *cachedAssignmentRepository) Create(ctx context.Context, assignment *domain.Assignment) (*domain.Assignment, error) {
	created, err := r.AssignmentRepository.Create(ctx, assignment)
	if err != nil {
		return nil, err
	}

	if err := r.store.Delete(ctx, assignmentsByDoctorCacheKey(created.DoctorID), assignmentsByNurseCacheKey(created.NurseID)); err != nil {
		log.Printf("[WARN] failed to invalidate assignment cache for patient %s: %v", created.PatientID.Hex(), err)
	}

	return created, nil
}
