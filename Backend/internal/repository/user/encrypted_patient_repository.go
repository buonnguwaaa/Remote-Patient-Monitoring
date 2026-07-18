package user

import (
	"context"
	"fmt"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PHI fields encrypted at rest in MongoDB (and in Redis when cache sits inside).
var patientPHIFields = []string{
	"phone",
	"insuranceNumber",
	"cccd",
	"medicalHistory",
	"emergencyContactName",
	"emergencyContactPhone",
}

// encryptedPatientRepository decorates PatientRepository so sensitive PHI
// fields are AES-GCM encrypted before persistence and decrypted after load.
// Wire this OUTSIDE the cache decorator so Redis never holds plaintext PHI:
//
//	Encrypted → Cached → Mongo
type encryptedPatientRepository struct {
	PatientRepository
	crypto util.FieldEncryptor
}

// NewEncryptedPatientRepository wraps repo with field-level PHI encryption.
// If crypto is nil or disabled (noop), calls pass through unchanged.
func NewEncryptedPatientRepository(repo PatientRepository, crypto util.FieldEncryptor) PatientRepository {
	if crypto == nil {
		crypto = util.NewNoopFieldEncryptor()
	}
	return &encryptedPatientRepository{PatientRepository: repo, crypto: crypto}
}

func (r *encryptedPatientRepository) Create(ctx context.Context, u *domain.Patient) (*domain.Patient, error) {
	if err := r.encryptPatient(u); err != nil {
		return nil, err
	}
	created, err := r.PatientRepository.Create(ctx, u)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPatient(created); err != nil {
		return nil, err
	}
	return created, nil
}

func (r *encryptedPatientRepository) FindPatients(ctx context.Context, f UserFilter) ([]domain.Patient, error) {
	patients, err := r.PatientRepository.FindPatients(ctx, f)
	if err != nil {
		return nil, err
	}
	for i := range patients {
		if err := r.decryptPatient(&patients[i]); err != nil {
			return nil, err
		}
	}
	return patients, nil
}

func (r *encryptedPatientRepository) FindPatientByID(ctx context.Context, id primitive.ObjectID) (*domain.Patient, error) {
	patient, err := r.PatientRepository.FindPatientByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPatient(patient); err != nil {
		return nil, err
	}
	return patient, nil
}

func (r *encryptedPatientRepository) FindPatientsByIDs(ctx context.Context, ids []primitive.ObjectID) ([]domain.Patient, error) {
	patients, err := r.PatientRepository.FindPatientsByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range patients {
		if err := r.decryptPatient(&patients[i]); err != nil {
			return nil, err
		}
	}
	return patients, nil
}

func (r *encryptedPatientRepository) FindPatientByEmail(ctx context.Context, email string) (*domain.Patient, error) {
	patient, err := r.PatientRepository.FindPatientByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPatient(patient); err != nil {
		return nil, err
	}
	return patient, nil
}

func (r *encryptedPatientRepository) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	encrypted, err := encryptMappedStringFields(r.crypto, updateData, patientPHIFields)
	if err != nil {
		return err
	}
	return r.PatientRepository.Update(ctx, id, encrypted)
}

func (r *encryptedPatientRepository) encryptPatient(p *domain.Patient) error {
	if p == nil || !r.crypto.Enabled() {
		return nil
	}
	var err error
	if p.Phone, err = r.crypto.Encrypt(p.Phone); err != nil {
		return fmt.Errorf("encrypt phone: %w", err)
	}
	if p.InsuranceNumber, err = r.crypto.Encrypt(p.InsuranceNumber); err != nil {
		return fmt.Errorf("encrypt insuranceNumber: %w", err)
	}
	if p.CCCD, err = r.crypto.Encrypt(p.CCCD); err != nil {
		return fmt.Errorf("encrypt cccd: %w", err)
	}
	if p.MedicalHistory, err = r.crypto.Encrypt(p.MedicalHistory); err != nil {
		return fmt.Errorf("encrypt medicalHistory: %w", err)
	}
	if p.EmergencyContactName, err = r.crypto.Encrypt(p.EmergencyContactName); err != nil {
		return fmt.Errorf("encrypt emergencyContactName: %w", err)
	}
	if p.EmergencyContactPhone, err = r.crypto.Encrypt(p.EmergencyContactPhone); err != nil {
		return fmt.Errorf("encrypt emergencyContactPhone: %w", err)
	}
	return nil
}

func (r *encryptedPatientRepository) decryptPatient(p *domain.Patient) error {
	if p == nil || !r.crypto.Enabled() {
		return nil
	}
	var err error
	if p.Phone, err = r.crypto.Decrypt(p.Phone); err != nil {
		return fmt.Errorf("decrypt phone: %w", err)
	}
	if p.InsuranceNumber, err = r.crypto.Decrypt(p.InsuranceNumber); err != nil {
		return fmt.Errorf("decrypt insuranceNumber: %w", err)
	}
	if p.CCCD, err = r.crypto.Decrypt(p.CCCD); err != nil {
		return fmt.Errorf("decrypt cccd: %w", err)
	}
	if p.MedicalHistory, err = r.crypto.Decrypt(p.MedicalHistory); err != nil {
		return fmt.Errorf("decrypt medicalHistory: %w", err)
	}
	if p.EmergencyContactName, err = r.crypto.Decrypt(p.EmergencyContactName); err != nil {
		return fmt.Errorf("decrypt emergencyContactName: %w", err)
	}
	if p.EmergencyContactPhone, err = r.crypto.Decrypt(p.EmergencyContactPhone); err != nil {
		return fmt.Errorf("decrypt emergencyContactPhone: %w", err)
	}
	return nil
}

