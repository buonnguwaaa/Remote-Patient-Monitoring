package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	temporalclient "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
	edto "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var (
	ErrFollowUpAppointmentNotFound     = errors.New("follow-up appointment not found")
	ErrFollowUpAppointmentAccessDenied = errors.New("access denied")
)

type FollowUpAppointmentService interface {
	CreateFollowUpAppointment(ctx context.Context, input *usecase.CreateFollowUpAppointmentInput) (*dto.FollowUpAppointmentResponse, error)
	GetFollowUpAppointments(ctx context.Context, input *usecase.GetFollowUpAppointmentsInput) ([]dto.FollowUpAppointmentResponse, error)
	GetFollowUpAppointmentByID(ctx context.Context, input *usecase.GetFollowUpAppointmentByIDInput) (*dto.FollowUpAppointmentResponse, error)
	UpdateFollowUpAppointment(ctx context.Context, input *usecase.UpdateFollowUpAppointmentInput) (*dto.FollowUpAppointmentResponse, error)
	UpdateFollowUpAppointmentStatus(ctx context.Context, input *usecase.UpdateFollowUpAppointmentStatusInput) (*dto.FollowUpAppointmentResponse, error)
}

type followUpAppointmentService struct {
	patientRepo     userRepository.PatientRepository
	assignmentRepo  repository.AssignmentRepository
	appointmentRepo repository.FollowUpAppointmentRepository
}

func NewFollowUpAppointmentService(
	patientRepo userRepository.PatientRepository,
	assignmentRepo repository.AssignmentRepository,
	appointmentRepo repository.FollowUpAppointmentRepository,
) FollowUpAppointmentService {
	return &followUpAppointmentService{
		patientRepo:     patientRepo,
		assignmentRepo:  assignmentRepo,
		appointmentRepo: appointmentRepo,
	}
}

func (s *followUpAppointmentService) CreateFollowUpAppointment(ctx context.Context, input *usecase.CreateFollowUpAppointmentInput) (*dto.FollowUpAppointmentResponse, error) {
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("invalid patient ID")
	}

	if err := s.ensurePatient(ctx, patientID); err != nil {
		return nil, err
	}

	doctorID, err := s.resolveDoctorID(ctx, input)
	if err != nil {
		return nil, err
	}

	createdByID, err := primitive.ObjectIDFromHex(input.CreatedBy)
	if err != nil {
		return nil, err
	}

	if err := s.ensureStaffCanAccessPatient(ctx, doctorID, patientID); err != nil {
		return nil, err
	}

	scheduledAt := input.ScheduledAt.UTC()
	if !scheduledAt.After(time.Now().UTC()) {
		return nil, errors.New("scheduled time must be in the future")
	}

	if input.Timezone == "" {
		return nil, errors.New("timezone is required")
	}

	created, err := s.appointmentRepo.Create(ctx, &domain.FollowUpAppointment{
		PatientID:   patientID,
		DoctorID:    doctorID,
		ScheduledAt: scheduledAt,
		Timezone:    input.Timezone,
		Location:    input.Location,
		Notes:       input.Notes,
		Status:      domain.FollowUpAppointmentStatusScheduled,
		CreatedBy:   createdByID,
	})
	if err != nil {
		return nil, err
	}

	if err := temporalclient.StartAppointmentReminderWorkflow(edto.AppointmentReminderWorkflowInput{
		AppointmentID: created.ID.Hex(),
	}); err != nil {
		_, _ = s.appointmentRepo.UpdateStatusByID(ctx, created.ID, domain.FollowUpAppointmentStatusCanceled)
		return nil, fmt.Errorf("failed to start appointment reminder workflow: %w", err)
	}

	return toFollowUpAppointmentResponse(created), nil
}

func (s *followUpAppointmentService) GetFollowUpAppointments(ctx context.Context, input *usecase.GetFollowUpAppointmentsInput) ([]dto.FollowUpAppointmentResponse, error) {
	appointments, err := s.appointmentRepo.FindWithFilter(ctx, repository.FollowUpAppointmentFilter{
		PatientID: input.PatientID,
		DoctorID:  input.DoctorID,
		NurseID:   input.NurseID,
		Status:    input.Status,
		From:      input.From,
		To:        input.To,
	})
	if err != nil {
		return nil, err
	}

	return toFollowUpAppointmentResponses(appointments), nil
}

func (s *followUpAppointmentService) GetFollowUpAppointmentByID(ctx context.Context, input *usecase.GetFollowUpAppointmentByIDInput) (*dto.FollowUpAppointmentResponse, error) {
	appointmentID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	appointment, err := s.requireAppointment(ctx, appointmentID)
	if err != nil {
		return nil, err
	}

	if err := s.ensureAppointmentAccess(ctx, input.Role, input.UserID, appointment); err != nil {
		return nil, err
	}

	return toFollowUpAppointmentResponse(appointment), nil
}

func (s *followUpAppointmentService) UpdateFollowUpAppointment(ctx context.Context, input *usecase.UpdateFollowUpAppointmentInput) (*dto.FollowUpAppointmentResponse, error) {
	appointmentID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	existing, err := s.requireAppointment(ctx, appointmentID)
	if err != nil {
		return nil, err
	}

	if existing.Status != domain.FollowUpAppointmentStatusScheduled {
		return nil, errors.New("only scheduled appointments can be updated")
	}

	reschedule := false
	if input.ScheduledAt != nil {
		scheduledAt := input.ScheduledAt.UTC()
		if !scheduledAt.After(time.Now().UTC()) {
			return nil, errors.New("scheduled time must be in the future")
		}
		existing.ScheduledAt = scheduledAt
		reschedule = true
	}
	if input.Timezone != nil {
		if *input.Timezone == "" {
			return nil, errors.New("timezone cannot be empty")
		}
		existing.Timezone = *input.Timezone
	}
	if input.Location != nil {
		existing.Location = *input.Location
	}
	if input.Notes != nil {
		existing.Notes = *input.Notes
	}

	updated, err := s.appointmentRepo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrFollowUpAppointmentNotFound
	}

	if reschedule {
		if err := temporalclient.SignalAppointmentReminderWorkflow(ctx, updated.ID.Hex()); err != nil {
			return nil, fmt.Errorf("appointment updated but failed to reschedule reminder: %w", err)
		}
	}

	return toFollowUpAppointmentResponse(updated), nil
}

func (s *followUpAppointmentService) UpdateFollowUpAppointmentStatus(ctx context.Context, input *usecase.UpdateFollowUpAppointmentStatusInput) (*dto.FollowUpAppointmentResponse, error) {
	appointmentID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	existing, err := s.requireAppointment(ctx, appointmentID)
	if err != nil {
		return nil, err
	}

	if existing.Status == input.Status {
		return toFollowUpAppointmentResponse(existing), nil
	}

	updated, err := s.appointmentRepo.UpdateStatusByID(ctx, appointmentID, input.Status)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrFollowUpAppointmentNotFound
	}

	if input.Status != domain.FollowUpAppointmentStatusScheduled {
		if err := temporalclient.SignalAppointmentReminderWorkflow(ctx, updated.ID.Hex()); err != nil {
			return nil, fmt.Errorf("appointment status updated but failed to update reminder workflow: %w", err)
		}
	}

	return toFollowUpAppointmentResponse(updated), nil
}

func (s *followUpAppointmentService) resolveDoctorID(ctx context.Context, input *usecase.CreateFollowUpAppointmentInput) (primitive.ObjectID, error) {
	if input.DoctorID != "" {
		doctorID, err := primitive.ObjectIDFromHex(input.DoctorID)
		if err != nil {
			return primitive.NilObjectID, errors.New("invalid doctor ID")
		}
		return doctorID, nil
	}

	createdByID, err := primitive.ObjectIDFromHex(input.CreatedBy)
	if err != nil {
		return primitive.NilObjectID, err
	}

	if input.ActorRole == userDomain.RoleDoctor {
		return createdByID, nil
	}

	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return primitive.NilObjectID, errors.New("invalid patient ID")
	}

	assignment, err := s.assignmentRepo.FindByPatientID(ctx, patientID)
	if err != nil || assignment == nil || assignment.DoctorID.IsZero() {
		return primitive.NilObjectID, errors.New("patient has no assigned doctor")
	}

	return assignment.DoctorID, nil
}

func (s *followUpAppointmentService) ensurePatient(ctx context.Context, patientID primitive.ObjectID) error {
	exists, err := s.patientRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient)
	if err != nil || !exists {
		return errors.New("user not found or not patient")
	}
	return nil
}

func (s *followUpAppointmentService) ensureStaffCanAccessPatient(ctx context.Context, staffID, patientID primitive.ObjectID) error {
	hasAssignment, err := s.assignmentRepo.HasAssignmentRecordForPair(ctx, staffID, patientID)
	if err != nil {
		return err
	}
	if !hasAssignment {
		return errors.New("patient is not assigned to this doctor")
	}
	return nil
}

func (s *followUpAppointmentService) requireAppointment(ctx context.Context, id primitive.ObjectID) (*domain.FollowUpAppointment, error) {
	appointment, err := s.appointmentRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if appointment == nil {
		return nil, ErrFollowUpAppointmentNotFound
	}
	return appointment, nil
}

func (s *followUpAppointmentService) ensureAppointmentAccess(ctx context.Context, role userDomain.Role, userID string, appointment *domain.FollowUpAppointment) error {
	id, err := util.MustHexToObjectID(userID)
	if err != nil {
		return err
	}

	switch role {
	case userDomain.RolePatient:
		if appointment.PatientID != id {
			return ErrFollowUpAppointmentAccessDenied
		}
	case userDomain.RoleDoctor:
		if appointment.DoctorID != id {
			hasAssignment, err := s.assignmentRepo.HasAssignmentRecordForPair(ctx, id, appointment.PatientID)
			if err != nil {
				return err
			}
			if !hasAssignment {
				return ErrFollowUpAppointmentAccessDenied
			}
		}
	case userDomain.RoleNurse:
		hasAssignment, err := s.assignmentRepo.HasAssignmentRecordForPair(ctx, id, appointment.PatientID)
		if err != nil {
			return err
		}
		if !hasAssignment {
			return ErrFollowUpAppointmentAccessDenied
		}
	}

	return nil
}

func toFollowUpAppointmentResponse(appointment *domain.FollowUpAppointment) *dto.FollowUpAppointmentResponse {
	return &dto.FollowUpAppointmentResponse{
		ID:          appointment.ID.Hex(),
		PatientID:   appointment.PatientID.Hex(),
		DoctorID:    appointment.DoctorID.Hex(),
		ScheduledAt: appointment.ScheduledAt,
		Timezone:    appointment.Timezone,
		Location:    appointment.Location,
		Notes:       appointment.Notes,
		Status:      appointment.Status,
		CreatedBy:   appointment.CreatedBy.Hex(),
		CreatedAt:   appointment.CreatedAt,
		UpdatedAt:   appointment.UpdatedAt,
	}
}

func toFollowUpAppointmentResponses(appointments []domain.FollowUpAppointment) []dto.FollowUpAppointmentResponse {
	result := make([]dto.FollowUpAppointmentResponse, len(appointments))
	for i := range appointments {
		resp := toFollowUpAppointmentResponse(&appointments[i])
		result[i] = *resp
	}
	return result
}
