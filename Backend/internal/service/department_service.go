package service

import (
	"context"
	"errors"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DepartmentService interface {
	Create(ctx context.Context, input *usecase.CreateDepartmentInput) (*usecase.DepartmentResponse, error)
	FindAll(ctx context.Context) ([]*usecase.DepartmentResponse, error)
	GetMembers(ctx context.Context, deptID string) ([]*usecase.Member, error)
	AddMember(ctx context.Context, deptID string, userID string) error
}

type departmentService struct {
	deptRepo repository.DepartmentRepository
	userRepo repository.UserRepository
}

func NewDepartmentService(deptRepo repository.DepartmentRepository, userRepo repository.UserRepository) DepartmentService {
	return &departmentService{
		deptRepo: deptRepo,
		userRepo: userRepo,
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

	users, err := s.userRepo.FindByDepartmentID(ctx, oid)
	if err != nil {
		return nil, err
	}

	var members []*usecase.Member
	for _, u := range users {
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

	// Check user role
	user, err := s.userRepo.FindByID(ctx, userOID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	if user.Role != domain.RoleDoctor && user.Role != domain.RoleNurse {
		return errors.New("only doctors and nurses can be assigned to departments")
	}

	return s.userRepo.UpdateDepartmentID(ctx, userOID, deptOID)
}

func (s *departmentService) mapToResponse(ctx context.Context, d *domain.Department) *usecase.DepartmentResponse {
	// Count members
	count, _ := s.userRepo.CountByDepartmentID(ctx, d.ID)

	return &usecase.DepartmentResponse{
		ID:          d.ID,
		Name:        d.Name,
		Description: d.Description,
		MemberCount: int(count),
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}
