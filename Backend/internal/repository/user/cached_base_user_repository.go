package user

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedBaseUser is the safe-to-cache projection of domain.BaseUser. It
// deliberately excludes Password, ResetToken(Expiry), and PhoneLookupHash:
// credential fields are read via dedicated, uncached lookups, and
// FindByID's actual callers (GET /auth/me, GetBaseUserByID, the activity-log
// middleware) never need them. This keeps credential material out of Redis
// even though the underlying Mongo document carries it.
type cachedBaseUser struct {
	ID           primitive.ObjectID `json:"id"`
	UserPublicID string             `json:"userPublicId"`
	Role         domain.Role        `json:"role"`
	Name         string             `json:"name"`
	Email        string             `json:"email"`
	Provider     string             `json:"provider"`
	Gender       domain.Gender      `json:"gender"`
	Dob          time.Time          `json:"dob"`
	Phone        string             `json:"phone"`
	AvatarUrl    string             `json:"avatarUrl"`
	Status       domain.Status      `json:"status"`
	CreatedAt    time.Time          `json:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt"`
}

func toCachedBaseUser(u *domain.BaseUser) cachedBaseUser {
	return cachedBaseUser{
		ID:           u.ID,
		UserPublicID: u.UserPublicID,
		Role:         u.Role,
		Name:         u.Name,
		Email:        u.Email,
		Provider:     u.Provider,
		Gender:       u.Gender,
		Dob:          u.Dob,
		Phone:        u.Phone,
		AvatarUrl:    u.AvatarUrl,
		Status:       u.Status,
		CreatedAt:    u.CreatedAt,
		UpdatedAt:    u.UpdatedAt,
	}
}

func (c cachedBaseUser) toDomain() *domain.BaseUser {
	return &domain.BaseUser{
		ID:           c.ID,
		UserPublicID: c.UserPublicID,
		Role:         c.Role,
		Name:         c.Name,
		Email:        c.Email,
		Provider:     c.Provider,
		Gender:       c.Gender,
		Dob:          c.Dob,
		Phone:        c.Phone,
		AvatarUrl:    c.AvatarUrl,
		Status:       c.Status,
		CreatedAt:    c.CreatedAt,
		UpdatedAt:    c.UpdatedAt,
	}
}

// cachedBaseUserRepository decorates a BaseUserRepository with a Redis
// cache-aside layer for FindByID, used by GET /auth/me, admin user lookups,
// and the activity-log middleware. Every other method (FindByEmail,
// FindWithFilter, password reset/activation flows, ...) passes through
// untouched.
//
// Caveat: role-specific profile writes (PatientRepository.Update,
// StaffRepository[T].Update/UpdateDepartmentID) write the same underlying
// "users" collection directly and do NOT go through this repository, so
// they can't invalidate this cache precisely. Those edits become visible
// after the entry's TTL expires rather than immediately. Genuinely
// security-relevant changes (role, status, password) go through
// BaseUserRepository.Update/Delete - via UserService.UpdateBaseUserStatus,
// DeleteBaseUser, etc. - which DO invalidate immediately below.
type cachedBaseUserRepository struct {
	BaseUserRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedBaseUserRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to
// repo unchanged, so this can be wired unconditionally.
func NewCachedBaseUserRepository(repo BaseUserRepository, store *cache.Store, ttl time.Duration) BaseUserRepository {
	return &cachedBaseUserRepository{BaseUserRepository: repo, store: store, ttl: ttl}
}

func baseUserCacheKey(id primitive.ObjectID) string {
	return "user:id:" + id.Hex()
}

func (r *cachedBaseUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.BaseUser, error) {
	key := baseUserCacheKey(id)

	var cached cachedBaseUser
	if err := r.store.Get(ctx, key, &cached); err == nil {
		return cached.toDomain(), nil
	}

	u, err := r.BaseUserRepository.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := r.store.Set(ctx, key, toCachedBaseUser(u), r.ttl); err != nil {
		log.Printf("[WARN] failed to cache user %s: %v", id.Hex(), err)
	}

	return u, nil
}

func (r *cachedBaseUserRepository) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	if err := r.BaseUserRepository.Update(ctx, id, updateData); err != nil {
		return err
	}
	r.invalidate(ctx, id)
	return nil
}

func (r *cachedBaseUserRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	if err := r.BaseUserRepository.Delete(ctx, id); err != nil {
		return err
	}
	r.invalidate(ctx, id)
	return nil
}

func (r *cachedBaseUserRepository) invalidate(ctx context.Context, id primitive.ObjectID) {
	if err := r.store.Delete(ctx, baseUserCacheKey(id)); err != nil {
		log.Printf("[WARN] failed to invalidate user cache %s: %v", id.Hex(), err)
	}
}
