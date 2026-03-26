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
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AssignmentService interface {
	AssignPatient(ctx context.Context, input *usecase.AssignPatientInput) (*dto.AssignmentResponse, error)
	GetAllAssignments(ctx context.Context) ([]*dto.AssignmentResponse, error)
	GetAssignmentsByRole(ctx context.Context, input *usecase.GetAssignmentsByRoleInput) ([]*dto.AssignmentResponse, error)
	DeleteAssignmentByID(ctx context.Context, input *usecase.DeleteAssignmentInput) error
}

type assignmentService struct {
	assignmentRepo repository.AssignmentRepository
	userRepo       userRepository.BaseUserRepository
}

func NewAssignmentService(assignmentRepo repository.AssignmentRepository, userRepo userRepository.BaseUserRepository) AssignmentService {
	return &assignmentService{
		assignmentRepo: assignmentRepo,
		userRepo:       userRepo,
	}
}

func (s *assignmentService) AssignPatient(ctx context.Context, input *usecase.AssignPatientInput) (*dto.AssignmentResponse, error) {
	patientID, err := util.MustHexToObjectID(input.PatientID)
	if err != nil {
		return nil, err
	}
	assignerID, err := util.MustHexToObjectID(input.AssignedBy)
	if err != nil {
		return nil, err
	}

	// Verify Patient Exists
	if exists, err := s.userRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient); err != nil || !exists {
		return nil, errors.New("patient not found")
	}

	var doctorID primitive.ObjectID
	if input.DoctorID != "" {
		doctorID, err = util.MustHexToObjectID(input.DoctorID)
		if err != nil {
			return nil, err
		}
		if exists, err := s.userRepo.ExistsByIDAndRole(ctx, doctorID, userDomain.RoleDoctor); err != nil || !exists {
			return nil, errors.New("doctor not found")
		}
	}

	var nurseID primitive.ObjectID
	if input.NurseID != "" {
		nurseID, err = util.MustHexToObjectID(input.NurseID)
		if err != nil {
			return nil, err
		}
		if exists, err := s.userRepo.ExistsByIDAndRole(ctx, nurseID, userDomain.RoleNurse); err != nil || !exists {
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

func (s *assignmentService) GetAssignmentsByRole(ctx context.Context, input *usecase.GetAssignmentsByRoleInput) ([]*dto.AssignmentResponse, error) {
	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}

	var (
		assignments []*domain.Assignment
		userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo
	)

	switch input.Role {
	case userDomain.RoleDoctor:
		assignments, userInfoMap, err = s.assignmentRepo.FindByDoctorIDWithNames(ctx, userID)
	case userDomain.RoleNurse:
		assignments, userInfoMap, err = s.assignmentRepo.FindByNurseIDWithNames(ctx, userID)
	default:
		return nil, errors.New("invalid role for getting assignments")
	}

	if err != nil {
		return nil, err
	}

	return s.mapListToResponse(assignments, userInfoMap), nil
}

func (s *assignmentService) GetAllAssignments(ctx context.Context) ([]*dto.AssignmentResponse, error) {
	assignments, userInfoMap, err := s.assignmentRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	return s.mapListToResponse(assignments, userInfoMap), nil
}

func (s *assignmentService) DeleteAssignmentByID(ctx context.Context, input *usecase.DeleteAssignmentInput) error {
	assignmentID, err := util.MustHexToObjectID(input.AssignmentID)
	if err != nil {
		return err
	}

	return s.assignmentRepo.DeleteByID(ctx, assignmentID)
}

func (s *assignmentService) mapListToResponse(assignments []*domain.Assignment, userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo) []*dto.AssignmentResponse {
	var responses []*dto.AssignmentResponse
	for _, a := range assignments {
		responses = append(responses, s.mapToResponseWithNames(a, userInfoMap))
	}
	return responses
}

func (s *assignmentService) mapToResponseWithNames(a *domain.Assignment, userInfoMap map[primitive.ObjectID]repository.UserDisplayInfo) *dto.AssignmentResponse {
	patient := userInfoMap[a.PatientID]
	doctor := userInfoMap[a.DoctorID]
	nurse := userInfoMap[a.NurseID]

	return &dto.AssignmentResponse{
		ID:              a.ID,
		PatientID:       a.PatientID,
		PatientPublicID: patient.PublicID,
		PatientName:     patient.Name,
		DoctorID:        a.DoctorID,
		DoctorPublicID:  doctor.PublicID,
		DoctorName:      doctor.Name,
		NurseID:         a.NurseID,
		NursePublicID:   nurse.PublicID,
		NurseName:       nurse.Name,
		AssignedBy:      a.AssignedBy,
		CreatedAt:       a.CreatedAt,
		UpdatedAt:       a.UpdatedAt,
	}
}

func (s *assignmentService) mapToResponse(ctx context.Context, a *domain.Assignment) *dto.AssignmentResponse {
	resp := &dto.AssignmentResponse{
		ID:         a.ID,
		PatientID:  a.PatientID,
		DoctorID:   a.DoctorID,
		NurseID:    a.NurseID,
		AssignedBy: a.AssignedBy,
		CreatedAt:  a.CreatedAt,
		UpdatedAt:  a.UpdatedAt,
	}

	if u, err := s.userRepo.FindByID(ctx, a.PatientID); err == nil {
		resp.PatientName = u.Name
		resp.PatientPublicID = u.UserPublicID
	}
	if !a.DoctorID.IsZero() {
		if u, err := s.userRepo.FindByID(ctx, a.DoctorID); err == nil {
			resp.DoctorName = u.Name
			resp.DoctorPublicID = u.UserPublicID
		}
	}
	if !a.NurseID.IsZero() {
		if u, err := s.userRepo.FindByID(ctx, a.NurseID); err == nil {
			resp.NurseName = u.Name
			resp.NursePublicID = u.UserPublicID
		}
	}

	return resp
}
