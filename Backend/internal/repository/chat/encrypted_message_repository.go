package chat

import (
	"context"
	"fmt"

	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// encryptedMessageRepository encrypts message Content at rest with AES-GCM.
type encryptedMessageRepository struct {
	MessageRepository
	crypto util.FieldEncryptor
}

func NewEncryptedMessageRepository(repo MessageRepository, crypto util.FieldEncryptor) MessageRepository {
	if crypto == nil {
		crypto = util.NewNoopFieldEncryptor()
	}
	return &encryptedMessageRepository{MessageRepository: repo, crypto: crypto}
}

func (r *encryptedMessageRepository) Create(ctx context.Context, message *chatDomain.Message) (*chatDomain.Message, error) {
	if err := r.encryptContent(message); err != nil {
		return nil, err
	}
	created, err := r.MessageRepository.Create(ctx, message)
	if err != nil {
		return nil, err
	}
	if err := r.decryptContent(created); err != nil {
		return nil, err
	}
	return created, nil
}

func (r *encryptedMessageRepository) FindByID(ctx context.Context, id primitive.ObjectID) (*chatDomain.Message, error) {
	message, err := r.MessageRepository.FindByID(ctx, id)
	if err != nil || message == nil {
		return message, err
	}
	if err := r.decryptContent(message); err != nil {
		return nil, err
	}
	return message, nil
}

func (r *encryptedMessageRepository) FindByIDs(ctx context.Context, ids []primitive.ObjectID) ([]*chatDomain.Message, error) {
	messages, err := r.MessageRepository.FindByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	for _, m := range messages {
		if err := r.decryptContent(m); err != nil {
			return nil, err
		}
	}
	return messages, nil
}

func (r *encryptedMessageRepository) FindWithFilter(ctx context.Context, filter MessageFilter) ([]*chatDomain.Message, error) {
	messages, err := r.MessageRepository.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, err
	}
	for _, m := range messages {
		if err := r.decryptContent(m); err != nil {
			return nil, err
		}
	}
	return messages, nil
}

func (r *encryptedMessageRepository) FindByConversationID(ctx context.Context, conversationID primitive.ObjectID, limit int) ([]*chatDomain.Message, error) {
	messages, err := r.MessageRepository.FindByConversationID(ctx, conversationID, limit)
	if err != nil {
		return nil, err
	}
	for _, m := range messages {
		if err := r.decryptContent(m); err != nil {
			return nil, err
		}
	}
	return messages, nil
}

func (r *encryptedMessageRepository) FindLatestByConversationID(ctx context.Context, conversationID primitive.ObjectID) (*chatDomain.Message, error) {
	message, err := r.MessageRepository.FindLatestByConversationID(ctx, conversationID)
	if err != nil || message == nil {
		return message, err
	}
	if err := r.decryptContent(message); err != nil {
		return nil, err
	}
	return message, nil
}

func (r *encryptedMessageRepository) encryptContent(m *chatDomain.Message) error {
	if m == nil || !r.crypto.Enabled() {
		return nil
	}
	encrypted, err := r.crypto.Encrypt(m.Content)
	if err != nil {
		return fmt.Errorf("encrypt message content: %w", err)
	}
	m.Content = encrypted
	return nil
}

func (r *encryptedMessageRepository) decryptContent(m *chatDomain.Message) error {
	if m == nil || !r.crypto.Enabled() {
		return nil
	}
	plain, err := r.crypto.Decrypt(m.Content)
	if err != nil {
		return fmt.Errorf("decrypt message content: %w", err)
	}
	m.Content = plain
	return nil
}
