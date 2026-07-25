package service

import (
	"context"
	"errors"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DepartmentService interface {
	Create(ctx context.Context, input *usecase.CreateDepartmentInput) (*dto.DepartmentResponse, error)
	Update(ctx context.Context, input *usecase.UpdateDepartmentInput) (*dto.DepartmentResponse, error)
	Delete(ctx context.Context, id string) error
	FindAll(ctx context.Context) ([]*dto.DepartmentResponse, error)
	GetMembers(ctx context.Context, input *usecase.GetDepartmentMembersInput) ([]*dto.Member, error)
	AddMember(ctx context.Context, input *usecase.AddDepartmentMemberInput) error
}

type departmentService struct {
	deptRepo   repository.DepartmentRepository
	doctorRepo userRepository.StaffRepository[userDomain.Doctor]
	nurseRepo  userRepository.StaffRepository[userDomain.Nurse]
}

func NewDepartmentService(
	deptRepo repository.DepartmentRepository,
	doctorRepo userRepository.StaffRepository[userDomain.Doctor],
	nurseRepo userRepository.StaffRepository[userDomain.Nurse],
) DepartmentService {
	return &departmentService{
		deptRepo:   deptRepo,
		doctorRepo: doctorRepo,
		nurseRepo:  nurseRepo,
	}
}

func (s *departmentService) Create(ctx context.Context, input *usecase.CreateDepartmentInput) (*dto.DepartmentResponse, error) {
	dept := &domain.Department{
		ID:          primitive.NewObjectID(),
		Name:        input.Name,
		Description: input.Description,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}

	created, err := s.deptRepo.Create(ctx, dept)
	if err != nil {
		return nil, err
	}

	return &dto.DepartmentResponse{
		ID:          created.ID,
		Name:        created.Name,
		Description: created.Description,
		MemberCount: 0,
		CreatedAt:   created.CreatedAt,
		UpdatedAt:   created.UpdatedAt,
	}, nil
}

func (s *departmentService) FindAll(ctx context.Context) ([]*dto.DepartmentResponse, error) {
	depts, err := s.deptRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	deptIDs := make([]primitive.ObjectID, 0, len(depts))
	for _, d := range depts {
		deptIDs = append(deptIDs, d.ID)
	}

	memberCounts, err := s.deptRepo.CountMembersByDepartmentIDs(ctx, deptIDs)
	if err != nil {
		return nil, err
	}

	var responses []*dto.DepartmentResponse
	for _, d := range depts {
		responses = append(responses, &dto.DepartmentResponse{
			ID:          d.ID,
			Name:        d.Name,
			Description: d.Description,
			MemberCount: memberCounts[d.ID],
			CreatedAt:   d.CreatedAt,
			UpdatedAt:   d.UpdatedAt,
		})
	}
	return responses, nil
}

func (s *departmentService) GetMembers(ctx context.Context, input *usecase.GetDepartmentMembersInput) ([]*dto.Member, error) {
	oid, err := primitive.ObjectIDFromHex(input.DepartmentID)
	if err != nil {
		return nil, err
	}

	users, err := s.deptRepo.FindMembersByDepartmentID(ctx, oid)
	if err != nil {
		return nil, err
	}

	var members []*dto.Member
	for _, u := range users {
		members = append(members, &dto.Member{
			ID:        u.ID.Hex(),
			Name:      u.Name,
			Email:     u.Email,
			Role:      string(u.Role),
			Avatar:    u.AvatarUrl,
			CreatedAt: u.CreatedAt.Format(time.RFC3339),
		})
	}

	return members, nil
}

func (s *departmentService) AddMember(ctx context.Context, input *usecase.AddDepartmentMemberInput) error {
	deptOID, err := primitive.ObjectIDFromHex(input.DepartmentID)
	if err != nil {
		return err
	}

	if _, err := s.deptRepo.FindByID(ctx, deptOID); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("Không tìm thấy khoa")
		}
		return err
	}

	userOID, err := primitive.ObjectIDFromHex(input.UserID)
	if err != nil {
		return err
	}

	if _, err := s.doctorRepo.FindByID(ctx, userOID); err == nil {
		return s.doctorRepo.UpdateDepartmentID(ctx, userOID, deptOID)
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}

	if _, err := s.nurseRepo.FindByID(ctx, userOID); err == nil {
		return s.nurseRepo.UpdateDepartmentID(ctx, userOID, deptOID)
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}

	return errors.New("Chỉ bác sĩ và y tá mới có thể được phân công vào khoa")
}

func (s *departmentService) Update(ctx context.Context, input *usecase.UpdateDepartmentInput) (*dto.DepartmentResponse, error) {
	oid, err := primitive.ObjectIDFromHex(input.ID)
	if err != nil {
		return nil, err
	}

	// Check if department exists
	existing, err := s.deptRepo.FindByID(ctx, oid)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("Không tìm thấy khoa")
		}
		return nil, err
	}

	// Update fields
	existing.Name = input.Name
	existing.Description = input.Description
	existing.UpdatedAt = time.Now().UTC()

	// Save to database
	updated, err := s.deptRepo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}

	// Get member count
	memberCount, err := s.deptRepo.CountMembersByDepartmentIDs(ctx, []primitive.ObjectID{updated.ID})
	if err != nil {
		memberCount = map[primitive.ObjectID]int{updated.ID: 0}
	}

	return &dto.DepartmentResponse{
		ID:          updated.ID,
		Name:        updated.Name,
		Description: updated.Description,
		MemberCount: memberCount[updated.ID],
		CreatedAt:   updated.CreatedAt,
		UpdatedAt:   updated.UpdatedAt,
	}, nil
}

func (s *departmentService) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	// Check if department exists
	_, err = s.deptRepo.FindByID(ctx, oid)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("Không tìm thấy khoa")
		}
		return err
	}

	// Check if department has members
	memberCount, err := s.deptRepo.CountMembersByDepartmentIDs(ctx, []primitive.ObjectID{oid})
	if err != nil {
		return err
	}

	if memberCount[oid] > 0 {
		return errors.New("Không thể xóa khoa đang có thành viên")
	}

	// Delete department
	return s.deptRepo.Delete(ctx, oid)
}
