package user

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedPatient is the safe-to-cache projection of domain.Patient, reusing
// cachedBaseUser to strip credential fields (see cached_base_user_repository.go).
type cachedPatient struct {
	cachedBaseUser
	InsuranceNumber       string              `json:"insuranceNumber"`
	CCCD                  string              `json:"cccd"`
	EmergencyContactName  string              `json:"emergencyContactName"`
	EmergencyContactPhone string              `json:"emergencyContactPhone"`
	MedicalHistory        string              `json:"medicalHistory"`
	DiseaseTypes          domain.DiseaseTypes `json:"diseaseTypes"`
}

func toCachedPatient(p *domain.Patient) cachedPatient {
	return cachedPatient{
		cachedBaseUser:        toCachedBaseUser(&p.BaseUser),
		InsuranceNumber:       p.InsuranceNumber,
		CCCD:                  p.CCCD,
		EmergencyContactName:  p.EmergencyContactName,
		EmergencyContactPhone: p.EmergencyContactPhone,
		MedicalHistory:        p.MedicalHistory,
		DiseaseTypes:          p.DiseaseTypes,
	}
}

func (c cachedPatient) toDomain() domain.Patient {
	return domain.Patient{
		BaseUser:              *c.cachedBaseUser.toDomain(),
		InsuranceNumber:       c.InsuranceNumber,
		CCCD:                  c.CCCD,
		EmergencyContactName:  c.EmergencyContactName,
		EmergencyContactPhone: c.EmergencyContactPhone,
		MedicalHistory:        c.MedicalHistory,
		DiseaseTypes:          c.DiseaseTypes,
	}
}

// cachedPatientRepository decorates a PatientRepository with a Redis
// cache-aside layer for FindPatientsByIDs, the batch profile lookup used
// alongside measurements/thresholds/assignments in the patient overview
// dashboard. Unlike BaseUserRepository, Update/Delete here write directly
// through this same repository (see patient_repository.go), so invalidation
// is precise - no cross-repository staleness gap.
type cachedPatientRepository struct {
	PatientRepository
	store *cache.Store
	ttl   time.Duration
}

// NewCachedPatientRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to
// repo unchanged, so this can be wired unconditionally.
func NewCachedPatientRepository(repo PatientRepository, store *cache.Store, ttl time.Duration) PatientRepository {
	return &cachedPatientRepository{PatientRepository: repo, store: store, ttl: ttl}
}

func patientProfileCacheKey(id primitive.ObjectID) string {
	return "patient:profile:" + id.Hex()
}

// FindPatientsByIDs serves each patient's profile from the cache when
// present, and only queries MongoDB for the patients that missed,
// backfilling the cache with what it finds.
func (r *cachedPatientRepository) FindPatientsByIDs(ctx context.Context, ids []primitive.ObjectID) ([]domain.Patient, error) {
	if len(ids) == 0 {
		return []domain.Patient{}, nil
	}

	result := make([]domain.Patient, 0, len(ids))
	missing := make([]primitive.ObjectID, 0, len(ids))

	for _, id := range ids {
		var cached cachedPatient
		if err := r.store.Get(ctx, patientProfileCacheKey(id), &cached); err == nil {
			result = append(result, cached.toDomain())
			continue
		}
		missing = append(missing, id)
	}

	if len(missing) == 0 {
		return result, nil
	}

	fetched, err := r.PatientRepository.FindPatientsByIDs(ctx, missing)
	if err != nil {
		return nil, err
	}

	for i := range fetched {
		p := fetched[i]
		result = append(result, p)
		if err := r.store.Set(ctx, patientProfileCacheKey(p.ID), toCachedPatient(&p), r.ttl); err != nil {
			log.Printf("[WARN] failed to cache patient %s: %v", p.ID.Hex(), err)
		}
	}

	return result, nil
}

func (r *cachedPatientRepository) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	if err := r.PatientRepository.Update(ctx, id, updateData); err != nil {
		return err
	}
	r.invalidate(ctx, id)
	return nil
}

func (r *cachedPatientRepository) Delete(ctx context.Context, id primitive.ObjectID) error {
	if err := r.PatientRepository.Delete(ctx, id); err != nil {
		return err
	}
	r.invalidate(ctx, id)
	return nil
}

func (r *cachedPatientRepository) invalidate(ctx context.Context, id primitive.ObjectID) {
	if err := r.store.Delete(ctx, patientProfileCacheKey(id)); err != nil {
		log.Printf("[WARN] failed to invalidate patient cache %s: %v", id.Hex(), err)
	}
}
