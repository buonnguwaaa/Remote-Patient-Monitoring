package user

import (
	"context"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// cachedMedicalStaff is the safe-to-cache projection shared by Doctor and
// Nurse, reusing cachedBaseUser to strip credential fields (see
// cached_base_user_repository.go). Specialization only applies to Doctor
// and is simply left empty when caching a Nurse.
type cachedMedicalStaff struct {
	cachedBaseUser
	DepartmentID              primitive.ObjectID                `json:"departmentId,omitempty"`
	Workplace                 string                            `json:"workplace,omitempty"`
	LicenseNumber             string                            `json:"licenseNumber,omitempty"`
	YearsOfExperience         int                               `json:"yearsOfExperience,omitempty"`
	Specialization            string                            `json:"specialization,omitempty"`
	AcademicDegree            domain.AcademicDegree             `json:"academicDegree,omitempty"`
	ProfessionalQualification domain.ProfessionalQualification  `json:"professionalQualification,omitempty"`
	AcademicTitle             domain.AcademicTitle              `json:"academicTitle,omitempty"`
}

// toCachedStaff and fromCachedStaff use the same type-switch approach as
// setStaffInfo/roleOfStaff in staff_repository.go, since Go generics don't
// support direct field access on a type parameter.
func toCachedStaff[T StaffEntity](u *T) cachedMedicalStaff {
	switch v := any(u).(type) {
	case *domain.Doctor:
		return cachedMedicalStaff{
			cachedBaseUser:            toCachedBaseUser(&v.BaseUser),
			DepartmentID:              v.DepartmentID,
			Workplace:                 v.Workplace,
			LicenseNumber:             v.LicenseNumber,
			YearsOfExperience:         v.YearsOfExperience,
			Specialization:            v.Specialization,
			AcademicDegree:            v.AcademicDegree,
			ProfessionalQualification: v.ProfessionalQualification,
			AcademicTitle:             v.AcademicTitle,
		}
	case *domain.Nurse:
		return cachedMedicalStaff{
			cachedBaseUser:    toCachedBaseUser(&v.BaseUser),
			DepartmentID:      v.DepartmentID,
			Workplace:         v.Workplace,
			LicenseNumber:     v.LicenseNumber,
			YearsOfExperience: v.YearsOfExperience,
		}
	default:
		return cachedMedicalStaff{}
	}
}

func fromCachedStaff[T StaffEntity](c cachedMedicalStaff) T {
	var zero T
	switch any(&zero).(type) {
	case *domain.Doctor:
		d := domain.Doctor{
			MedicalStaff: domain.MedicalStaff{
				BaseUser:          *c.cachedBaseUser.toDomain(),
				DepartmentID:      c.DepartmentID,
				Workplace:         c.Workplace,
				LicenseNumber:     c.LicenseNumber,
				YearsOfExperience: c.YearsOfExperience,
			},
			Specialization:            c.Specialization,
			AcademicDegree:            c.AcademicDegree,
			ProfessionalQualification: c.ProfessionalQualification,
			AcademicTitle:             c.AcademicTitle,
		}
		return any(d).(T)
	case *domain.Nurse:
		n := domain.Nurse{
			MedicalStaff: domain.MedicalStaff{
				BaseUser:          *c.cachedBaseUser.toDomain(),
				DepartmentID:      c.DepartmentID,
				Workplace:         c.Workplace,
				LicenseNumber:     c.LicenseNumber,
				YearsOfExperience: c.YearsOfExperience,
			},
		}
		return any(n).(T)
	default:
		return zero
	}
}

// cachedStaffRepository decorates a StaffRepository[T] with a Redis
// cache-aside layer for FindStaffByID, the single-record lookup used by the
// admin doctor/nurse detail pages (GetDoctorByID/GetNurseByID). FindStaffs,
// FindStaffByEmail, FindByDepartmentID, and the embedded BaseUserRepository
// methods pass through untouched - they're either list queries (not worth
// caching by a single key) or not on a hot path today.
//
// Update, Delete, and UpdateDepartmentID all write straight through this
// same repository (see staff_repository.go), so invalidation here is
// precise, same as cachedPatientRepository.
type cachedStaffRepository[T StaffEntity] struct {
	StaffRepository[T]
	store *cache.Store
	ttl   time.Duration
	role  domain.Role
}

// NewCachedStaffRepository wraps repo with cache-aside reads backed by
// store. If store is disabled (nil client), every call falls through to
// repo unchanged, so this can be wired unconditionally.
func NewCachedStaffRepository[T StaffEntity](repo StaffRepository[T], store *cache.Store, ttl time.Duration) StaffRepository[T] {
	return &cachedStaffRepository[T]{StaffRepository: repo, store: store, ttl: ttl, role: expectedStaffRole[T]()}
}

func staffCacheKey(role domain.Role, id primitive.ObjectID) string {
	return "staff:" + string(role) + ":id:" + id.Hex()
}

func (r *cachedStaffRepository[T]) FindStaffByID(ctx context.Context, id primitive.ObjectID) (*T, error) {
	key := staffCacheKey(r.role, id)

	var cached cachedMedicalStaff
	if err := r.store.Get(ctx, key, &cached); err == nil {
		staff := fromCachedStaff[T](cached)
		return &staff, nil
	}

	u, err := r.StaffRepository.FindStaffByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if err := r.store.Set(ctx, key, toCachedStaff(u), r.ttl); err != nil {
		log.Printf("[WARN] failed to cache staff %s: %v", id.Hex(), err)
	}

	return u, nil
}

func (r *cachedStaffRepository[T]) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	if err := r.StaffRepository.Update(ctx, id, updateData); err != nil {
		return err
	}
	r.invalidate(ctx, id)
	return nil
}

func (r *cachedStaffRepository[T]) Delete(ctx context.Context, id primitive.ObjectID) error {
	if err := r.StaffRepository.Delete(ctx, id); err != nil {
		return err
	}
	r.invalidate(ctx, id)
	return nil
}

func (r *cachedStaffRepository[T]) UpdateDepartmentID(ctx context.Context, userID primitive.ObjectID, deptID primitive.ObjectID) error {
	if err := r.StaffRepository.UpdateDepartmentID(ctx, userID, deptID); err != nil {
		return err
	}
	r.invalidate(ctx, userID)
	return nil
}

func (r *cachedStaffRepository[T]) invalidate(ctx context.Context, id primitive.ObjectID) {
	if err := r.store.Delete(ctx, staffCacheKey(r.role, id)); err != nil {
		log.Printf("[WARN] failed to invalidate staff cache %s: %v", id.Hex(), err)
	}
}
