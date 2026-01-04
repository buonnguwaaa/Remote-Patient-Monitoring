package service

import (
	"context"
	"errors"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AssignmentService interface {
	AssignPatient(ctx context.Context, input *usecase.AssignPatientInput, assignedBy string) (*usecase.AssignmentResponse, error)
	GetAssignmentsByRole(ctx context.Context, userID string, role domain.Role) ([]*usecase.AssignmentResponse, error)
}

type assignmentService struct {
	assignmentRepo repository.AssignmentRepository
	userRepo       repository.UserRepository
}

func NewAssignmentService(assignmentRepo repository.AssignmentRepository, userRepo repository.UserRepository) AssignmentService {
	return &assignmentService{
		assignmentRepo: assignmentRepo,
		userRepo:       userRepo,
	}
}

func (s *assignmentService) AssignPatient(ctx context.Context, input *usecase.AssignPatientInput, assignedBy string) (*usecase.AssignmentResponse, error) {
	patientID, err := util.MustHexToObjectID(input.PatientID)
	if err != nil {
		return nil, err
	}
	assignerID, err := util.MustHexToObjectID(assignedBy)
	if err != nil {
		return nil, err
	}

	// Verify Patient Exists
	if exists, err := s.userRepo.ExistsByIDAndRole(ctx, patientID, domain.RolePatient); err != nil || !exists {
		return nil, errors.New("patient not found")
	}

	var doctorID primitive.ObjectID
	if input.DoctorID != "" {
		doctorID, err = util.MustHexToObjectID(input.DoctorID)
		if err != nil {
			return nil, err
		}
		if exists, err := s.userRepo.ExistsByIDAndRole(ctx, doctorID, domain.RoleDoctor); err != nil || !exists {
			return nil, errors.New("doctor not found")
		}
	}

	var nurseID primitive.ObjectID
	if input.NurseID != "" {
		nurseID, err = util.MustHexToObjectID(input.NurseID)
		if err != nil {
			return nil, err
		}
		if exists, err := s.userRepo.ExistsByIDAndRole(ctx, nurseID, domain.RoleNurse); err != nil || !exists {
			return nil, errors.New("nurse not found")
		}
	}

	if doctorID.IsZero() && nurseID.IsZero() {
		return nil, errors.New("must assign at least one doctor or nurse")
	}

	assignment := &domain.Assignment{
		ID:         primitive.NewObjectID(),
		PatientID:  patientID,
		DoctorID:   doctorID,
		NurseID:    nurseID,
		AssignedBy: assignerID,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	created, err := s.assignmentRepo.Create(ctx, assignment)
	if err != nil {
		return nil, err
	}

	return s.mapToResponse(ctx, created), nil
}

func (s *assignmentService) GetAssignmentsByRole(ctx context.Context, userIDStr string, role domain.Role) ([]*usecase.AssignmentResponse, error) {
	userID, err := util.MustHexToObjectID(userIDStr)
	if err != nil {
		return nil, err
	}

	var assignments []*domain.Assignment
	
	switch role {
	case domain.RoleDoctor:
		assignments, err = s.assignmentRepo.FindByDoctorID(ctx, userID)
	case domain.RoleNurse:
		assignments, err = s.assignmentRepo.FindByNurseID(ctx, userID)
	default:
		return nil, errors.New("invalid role for getting assignments")
	}

	if err != nil {
		return nil, err
	}
	
	return s.mapListToResponse(ctx, assignments), nil
}

func (s *assignmentService) mapListToResponse(ctx context.Context, assignments []*domain.Assignment) []*usecase.AssignmentResponse {
	var responses []*usecase.AssignmentResponse
	for _, a := range assignments {
		responses = append(responses, s.mapToResponse(ctx, a))
	}
	return responses
}

func (s *assignmentService) mapToResponse(ctx context.Context, a *domain.Assignment) *usecase.AssignmentResponse {
	resp := &usecase.AssignmentResponse{
		ID:         a.ID,
		PatientID:  a.PatientID,
		DoctorID:   a.DoctorID,
		NurseID:    a.NurseID,
		AssignedBy: a.AssignedBy,
		CreatedAt:  a.CreatedAt,
		UpdatedAt:  a.UpdatedAt,
	}

	// Ideally we could batch fetch names, but for simplicity we fetch individual
	if u, err := s.userRepo.FindByID(ctx, a.PatientID); err == nil {
		resp.PatientName = u.Name
	}
	if !a.DoctorID.IsZero() {
		if u, err := s.userRepo.FindByID(ctx, a.DoctorID); err == nil {
			resp.DoctorName = u.Name
		}
	}
	if !a.NurseID.IsZero() {
		if u, err := s.userRepo.FindByID(ctx, a.NurseID); err == nil {
			resp.NurseName = u.Name
		}
	}

	return resp
}
