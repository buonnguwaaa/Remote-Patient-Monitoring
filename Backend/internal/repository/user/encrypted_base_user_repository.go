package user

import (
	"context"
	"fmt"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// encryptedBaseUserRepository encrypts phone on BaseUser read/write paths.
// Wire OUTSIDE the cache decorator so Redis stores ciphertext:
//
//	Encrypted → Cached → Mongo
type encryptedBaseUserRepository struct {
	BaseUserRepository
	crypto util.FieldEncryptor
}

func NewEncryptedBaseUserRepository(repo BaseUserRepository, crypto util.FieldEncryptor) BaseUserRepository {
	if crypto == nil {
		crypto = util.NewNoopFieldEncryptor()
	}
	return &encryptedBaseUserRepository{BaseUserRepository: repo, crypto: crypto}
}

func (r *encryptedBaseUserRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*domain.BaseUser, error) {
	user, err := r.BaseUserRepository.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPhone(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (r *encryptedBaseUserRepository) FindByEmail(ctx context.Context, email string) (*domain.BaseUser, error) {
	user, err := r.BaseUserRepository.FindByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPhone(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (r *encryptedBaseUserRepository) FindWithFilter(ctx context.Context, f UserFilter) ([]domain.BaseUser, error) {
	users, err := r.BaseUserRepository.FindWithFilter(ctx, f)
	if err != nil {
		return nil, err
	}
	for i := range users {
		if err := r.decryptPhone(&users[i]); err != nil {
			return nil, err
		}
	}
	return users, nil
}

func (r *encryptedBaseUserRepository) FindByEmailAndResetOTP(ctx context.Context, email, otpHash string) (*domain.BaseUser, error) {
	user, err := r.BaseUserRepository.FindByEmailAndResetOTP(ctx, email, otpHash)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPhone(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (r *encryptedBaseUserRepository) FindByEmailAndActivationHash(ctx context.Context, email, hash string) (*domain.BaseUser, error) {
	user, err := r.BaseUserRepository.FindByEmailAndActivationHash(ctx, email, hash)
	if err != nil {
		return nil, err
	}
	if err := r.decryptPhone(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (r *encryptedBaseUserRepository) Update(ctx context.Context, id primitive.ObjectID, updateData map[string]interface{}) error {
	encrypted, err := encryptMappedStringFields(r.crypto, updateData, []string{phoneField})
	if err != nil {
		return err
	}
	return r.BaseUserRepository.Update(ctx, id, encrypted)
}

func (r *encryptedBaseUserRepository) decryptPhone(u *domain.BaseUser) error {
	if u == nil || !r.crypto.Enabled() {
		return nil
	}
	plain, err := r.crypto.Decrypt(u.Phone)
	if err != nil {
		return fmt.Errorf("decrypt phone: %w", err)
	}
	u.Phone = plain
	return nil
}
