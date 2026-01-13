package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/workflow"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type reminderService struct {
	userRepo     repository.UserRepository
	reminderRepo repository.ReminderRepository
}

type ReminderService interface {
	CreateReminder(ctx context.Context, input *usecase.CreateReminderInput) (*dto.ReminderResponse, error)
	GetReminders(ctx context.Context, input *usecase.GetRemindersInput) ([]dto.ReminderResponse, error)
	UpdateReminderByID(ctx context.Context, input *usecase.UpdateReminderInput) (*dto.ReminderResponse, error)
	UpdateReminderStatus(ctx context.Context, input *usecase.UpdateReminderStatusInput) (*dto.ReminderResponse, error)
}

func NewReminderService(userRepo repository.UserRepository, reminderRepo repository.ReminderRepository) ReminderService {
	return &reminderService{
		userRepo:     userRepo,
		reminderRepo: reminderRepo,
	}
}

func (s *reminderService) CreateReminder(ctx context.Context, input *usecase.CreateReminderInput) (*dto.ReminderResponse, error) {
	// Validate patient exists
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("invalid patient ID")
	}

	existedPatient, err := s.userRepo.ExistsByIDAndRole(ctx, patientID, domain.RolePatient)
	if err != nil || !existedPatient {
		return nil, errors.New("user not found or not patient")
	}

	createdByID, err := primitive.ObjectIDFromHex(input.CreatedBy)
	if err != nil {
		return nil, err
	}

	reminder := &domain.Reminder{
		PatientID:  patientID,
		Kind:       input.Kind,
		Message:    input.Message,
		Hour:       input.Hour,
		Minute:     input.Minute,
		DaysOfWeek: input.DaysOfWeek,
		Timezone:   input.Timezone,
		Status:     domain.StatusActive,
		StartDate:  input.StartDate,
		EndDate:    input.EndDate,
		CreatedBy:  createdByID,
	}

	createdReminder, err := s.reminderRepo.Create(ctx, reminder)
	if err != nil {
		return nil, err
	}

	fmt.Println("=======================", createdReminder.ID.Hex())

	err = client.StartReminderWorkflow(workflow.ReminderWorkflowInput{
		ReminderID: createdReminder.ID.Hex(),
	})
	if err != nil {
		return nil, err
	}

	return &dto.ReminderResponse{
		ID:         createdReminder.ID.Hex(),
		PatientID:  createdReminder.PatientID.Hex(),
		Kind:       createdReminder.Kind,
		Message:    createdReminder.Message,
		Hour:       createdReminder.Hour,
		Minute:     createdReminder.Minute,
		DaysOfWeek: createdReminder.DaysOfWeek,
		Timezone:   createdReminder.Timezone,
		Status:     createdReminder.Status,
		StartDate:  createdReminder.StartDate,
		EndDate:    createdReminder.EndDate,
		CreatedBy:  createdReminder.CreatedBy.Hex(),
		CreatedAt:  createdReminder.CreatedAt,
		UpdatedAt:  createdReminder.UpdatedAt,
	}, nil
}

func (s *reminderService) GetReminders(ctx context.Context, input *usecase.GetRemindersInput) ([]dto.ReminderResponse, error) {
	filter := repository.ReminderFilter{
		PatientID: input.PatientID,
		Status:    input.Status,
		Kind:      input.Kind,
		IsLatest:  input.IsLatest,
	}

	reminders, err := s.reminderRepo.FindWithFilter(ctx, filter)
	if err != nil {
		return nil, err
	}

	var responses []dto.ReminderResponse
	for _, reminder := range reminders {
		responses = append(responses, dto.ReminderResponse{
			ID:         reminder.ID.Hex(),
			PatientID:  reminder.PatientID.Hex(),
			Kind:       reminder.Kind,
			Message:    reminder.Message,
			Hour:       reminder.Hour,
			Minute:     reminder.Minute,
			DaysOfWeek: reminder.DaysOfWeek,
			Timezone:   reminder.Timezone,
			Status:     reminder.Status,
			StartDate:  reminder.StartDate,
			EndDate:    reminder.EndDate,
			CreatedBy:  reminder.CreatedBy.Hex(),
			CreatedAt:  reminder.CreatedAt,
			UpdatedAt:  reminder.UpdatedAt,
		})
	}

	return responses, nil
}

func (s *reminderService) UpdateReminderByID(ctx context.Context, input *usecase.UpdateReminderInput) (*dto.ReminderResponse, error) {
	reminderID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	// Check if reminder exists
	existingReminder, err := s.reminderRepo.FindByID(ctx, reminderID)
	if err != nil {
		return nil, err
	}
	if existingReminder == nil {
		return nil, errors.New("reminder not found")
	}

	// Update fields
	existingReminder.Message = input.Message
	existingReminder.Status = input.Status
	existingReminder.Hour = input.Hour
	existingReminder.Minute = input.Minute
	existingReminder.DaysOfWeek = input.DaysOfWeek
	existingReminder.Timezone = input.Timezone
	existingReminder.StartDate = input.StartDate
	existingReminder.EndDate = input.EndDate

	updatedReminder, err := s.reminderRepo.Update(ctx, existingReminder)
	if err != nil {
		return nil, err
	}

	if input.Status != "" {
		err := client.SignalReminderWorkflow(
			ctx,
			existingReminder.ID.Hex(),
		)
		if err != nil {
			return nil, err
		}
	}

	return &dto.ReminderResponse{
		ID:         updatedReminder.ID.Hex(),
		PatientID:  updatedReminder.PatientID.Hex(),
		Kind:       updatedReminder.Kind,
		Message:    updatedReminder.Message,
		Hour:       updatedReminder.Hour,
		Minute:     updatedReminder.Minute,
		DaysOfWeek: updatedReminder.DaysOfWeek,
		Timezone:   updatedReminder.Timezone,
		Status:     updatedReminder.Status,
		StartDate:  updatedReminder.StartDate,
		EndDate:    updatedReminder.EndDate,
		CreatedBy:  updatedReminder.CreatedBy.Hex(),
		CreatedAt:  updatedReminder.CreatedAt,
		UpdatedAt:  updatedReminder.UpdatedAt,
	}, nil
}

func (s *reminderService) UpdateReminderStatus(ctx context.Context, input *usecase.UpdateReminderStatusInput) (*dto.ReminderResponse, error) {
	reminderID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	// Check if reminder exists
	existingReminder, err := s.reminderRepo.FindByID(ctx, reminderID)
	if err != nil {
		return nil, err
	}
	if existingReminder == nil {
		return nil, errors.New("reminder not found")
	}

	// Update status only
	updatedReminder, err := s.reminderRepo.UpdateStatusByID(ctx, reminderID, input.Status)
	if err != nil {
		return nil, err
	}

	// Signal the workflow if status changed
	err = client.SignalReminderWorkflow(
		ctx,
		reminderID.Hex(),
	)
	if err != nil {
		return nil, err
	}

	return &dto.ReminderResponse{
		ID:         updatedReminder.ID.Hex(),
		PatientID:  updatedReminder.PatientID.Hex(),
		Kind:       updatedReminder.Kind,
		Message:    updatedReminder.Message,
		Hour:       updatedReminder.Hour,
		Minute:     updatedReminder.Minute,
		DaysOfWeek: updatedReminder.DaysOfWeek,
		Timezone:   updatedReminder.Timezone,
		Status:     updatedReminder.Status,
		StartDate:  updatedReminder.StartDate,
		EndDate:    updatedReminder.EndDate,
		CreatedBy:  updatedReminder.CreatedBy.Hex(),
		CreatedAt:  updatedReminder.CreatedAt,
		UpdatedAt:  updatedReminder.UpdatedAt,
	}, nil
}
