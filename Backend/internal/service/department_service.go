package service

import (
	"context"
	"errors"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type DepartmentService interface {
	Create(ctx context.Context, input *usecase.CreateDepartmentInput) (*usecase.DepartmentResponse, error)
	FindAll(ctx context.Context) ([]*usecase.DepartmentResponse, error)
	GetMembers(ctx context.Context, deptID string) ([]*usecase.Member, error)
	AddMember(ctx context.Context, deptID string, userID string) error
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

func (s *departmentService) Create(ctx context.Context, input *usecase.CreateDepartmentInput) (*usecase.DepartmentResponse, error) {
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

	return s.mapToResponse(ctx, created), nil
}

func (s *departmentService) FindAll(ctx context.Context) ([]*usecase.DepartmentResponse, error) {
	depts, err := s.deptRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	var responses []*usecase.DepartmentResponse
	for _, d := range depts {
		responses = append(responses, s.mapToResponse(ctx, d))
	}
	return responses, nil
}

func (s *departmentService) GetMembers(ctx context.Context, deptID string) ([]*usecase.Member, error) {
	oid, err := primitive.ObjectIDFromHex(deptID)
	if err != nil {
		return nil, err
	}

	doctors, err := s.doctorRepo.FindByDepartmentID(ctx, oid)
	if err != nil {
		return nil, err
	}
	nurses, err := s.nurseRepo.FindByDepartmentID(ctx, oid)
	if err != nil {
		return nil, err
	}

	var members []*usecase.Member
	for _, u := range doctors {
		members = append(members, &usecase.Member{
			ID:        u.ID.Hex(),
			Name:      u.Name,
			Email:     u.Email,
			Role:      string(u.Role),
			Avatar:    "", // Placeholder if avatar not available in user struct
			CreatedAt: u.CreatedAt.Format(time.RFC3339),
		})
	}
	for _, u := range nurses {
		members = append(members, &usecase.Member{
			ID:        u.ID.Hex(),
			Name:      u.Name,
			Email:     u.Email,
			Role:      string(u.Role),
			Avatar:    "", // Placeholder if avatar not available in user struct
			CreatedAt: u.CreatedAt.Format(time.RFC3339),
		})
	}
	return members, nil
}

func (s *departmentService) AddMember(ctx context.Context, deptID string, userID string) error {
	deptOID, err := primitive.ObjectIDFromHex(deptID)
	if err != nil {
		return err
	}
	userOID, err := primitive.ObjectIDFromHex(userID)
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

	return errors.New("only doctors and nurses can be assigned to departments")
}

func (s *departmentService) mapToResponse(ctx context.Context, d *domain.Department) *usecase.DepartmentResponse {
	// Count members
	doctorCount, _ := s.doctorRepo.CountByDepartmentID(ctx, d.ID)
	nurseCount, _ := s.nurseRepo.CountByDepartmentID(ctx, d.ID)

	return &usecase.DepartmentResponse{
		ID:          d.ID,
		Name:        d.Name,
		Description: d.Description,
		MemberCount: int(doctorCount + nurseCount),
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}
