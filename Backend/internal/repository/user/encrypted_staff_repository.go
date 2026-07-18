package user

import (
	"context"
	"fmt"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	staffLicenseField = "licenseNumber"
)

var staffSensitiveFields = []string{staffLicenseField, phoneField}

// encryptedStaffRepository decorates StaffRepository so licenseNumber and
// phone are AES-GCM encrypted at rest. Wire OUTSIDE the cache decorator:
//
//	Encrypted → Cached → Mongo
type encryptedStaffRepository[T StaffEntity] struct {
	StaffRepository[T]
	crypto util.FieldEncryptor
}

// NewEncryptedStaffRepository wraps repo with licenseNumber field encryption.
func NewEncryptedStaffRepository[T StaffEntity](repo StaffRepository[T], crypto util.FieldEncryptor) StaffRepository[T] {
	if crypto == nil {
		crypto = util.NewNoopFieldEncryptor()
	}
	return &encryptedStaffRepository[T]{StaffRepository: repo, crypto: crypto}
}

func (r *encryptedStaffRepository[T]) Create(ctx context.Context, u *T) (*T, error) {
	if err := r.encryptStaff(u); err != nil {
		return nil, err
	}
	created, err := r.StaffRepository.Create(ctx, u)
	if err != nil {
		return nil, err
	}
	if err := r.decryptStaff(created); err != nil {
		return nil, err
	}
	return created, nil
}

func (r *encryptedStaffRepository[T]) FindStaffs(ctx context.Context, f UserFilter) ([]T, error) {
	staffs, err := r.StaffRepository.FindStaffs(ctx, f)
	if err != nil {
		return nil, err
	}
	for i := range staffs {
		if err := r.decryptStaff(&staffs[i]); err != nil {
			return nil, err
		}
	}
	return staffs, nil
}

func (r *encryptedStaffRepository[T]) FindStaffByEmail(ctx context.Context, email string) (*T, error) {
	staff, err := r.StaffRepository.FindStaffByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if err := r.decryptStaff(staff); err != nil {
		return nil, err
	}
	return staff, nil
}

func (r *encryptedStaffRepository[T]) FindStaffByID(ctx context.Context, id primitive.ObjectID) (*T, error) {
	staff, err := r.StaffRepository.FindStaffByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := r.decryptStaff(staff); err != nil {
		return nil, err
	}
	return staff, nil
}

func (r *encryptedStaffRepository[T]) FindByDepartmentID(ctx context.Context, deptID primitive.ObjectID) ([]T, error) {
	staffs, err := r.StaffRepository.FindByDepartmentID(ctx, deptID)
	if err != nil {
		return nil, err
	}
	for i := range staffs {
		if err := r.decryptStaff(&staffs[i]); err != nil {
			return nil, err
		}
	}
	return staffs, nil
}

func (r *encryptedStaffRepository[T]) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	encrypted, err := encryptMappedStringFields(r.crypto, updateData, staffSensitiveFields)
	if err != nil {
		return err
	}
	return r.StaffRepository.Update(ctx, id, encrypted)
}

func (r *encryptedStaffRepository[T]) encryptStaff(u *T) error {
	if u == nil || !r.crypto.Enabled() {
		return nil
	}
	license, err := r.crypto.Encrypt(licenseNumberOf(u))
	if err != nil {
		return fmt.Errorf("encrypt licenseNumber: %w", err)
	}
	setLicenseNumber(u, license)

	phone, err := r.crypto.Encrypt(phoneOf(u))
	if err != nil {
		return fmt.Errorf("encrypt phone: %w", err)
	}
	setPhone(u, phone)
	return nil
}

func (r *encryptedStaffRepository[T]) decryptStaff(u *T) error {
	if u == nil || !r.crypto.Enabled() {
		return nil
	}
	license, err := r.crypto.Decrypt(licenseNumberOf(u))
	if err != nil {
		return fmt.Errorf("decrypt licenseNumber: %w", err)
	}
	setLicenseNumber(u, license)

	phone, err := r.crypto.Decrypt(phoneOf(u))
	if err != nil {
		return fmt.Errorf("decrypt phone: %w", err)
	}
	setPhone(u, phone)
	return nil
}

func licenseNumberOf[T StaffEntity](u *T) string {
	switch v := any(u).(type) {
	case *domain.Doctor:
		return v.LicenseNumber
	case *domain.Nurse:
		return v.LicenseNumber
	default:
		return ""
	}
}

func setLicenseNumber[T StaffEntity](u *T, value string) {
	switch v := any(u).(type) {
	case *domain.Doctor:
		v.LicenseNumber = value
	case *domain.Nurse:
		v.LicenseNumber = value
	}
}

func phoneOf[T StaffEntity](u *T) string {
	switch v := any(u).(type) {
	case *domain.Doctor:
		return v.Phone
	case *domain.Nurse:
		return v.Phone
	default:
		return ""
	}
}

func setPhone[T StaffEntity](u *T, value string) {
	switch v := any(u).(type) {
	case *domain.Doctor:
		v.Phone = value
	case *domain.Nurse:
		v.Phone = value
	}
}
