package service

import (
	"context"
	"errors"
	"fmt"
	"sort"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
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

type reminderService struct {
	patientRepo    userRepository.PatientRepository
	reminderRepo   repository.ReminderRepository
	assignmentRepo repository.AssignmentRepository
}

type ReminderService interface {
	CreateReminder(ctx context.Context, input *usecase.CreateReminderInput) (*dto.ReminderResponse, error)
	GetReminders(ctx context.Context, input *usecase.GetRemindersInput) ([]dto.ReminderResponse, error)
	GetMyReminders(ctx context.Context, input *usecase.GetMyRemindersInput) ([]dto.ReminderResponse, error)
	UpdateReminderByID(ctx context.Context, input *usecase.UpdateReminderInput) (*dto.ReminderResponse, error)
	UpdateReminderStatus(ctx context.Context, input *usecase.UpdateReminderStatusInput) (*dto.ReminderResponse, error)
}

func NewReminderService(
	patientRepo userRepository.PatientRepository,
	reminderRepo repository.ReminderRepository,
	assignmentRepo repository.AssignmentRepository,
) ReminderService {
	return &reminderService{
		patientRepo:    patientRepo,
		reminderRepo:   reminderRepo,
		assignmentRepo: assignmentRepo,
	}
}

func (s *reminderService) CreateReminder(ctx context.Context, input *usecase.CreateReminderInput) (*dto.ReminderResponse, error) {
	// Validate patient exists
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("ID bệnh nhân không hợp lệ")
	}

	existedPatient, err := s.patientRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient)
	if err != nil || !existedPatient {
		return nil, errors.New("Không tìm thấy người dùng hoặc người dùng không phải bệnh nhân")
	}

	createdByID, err := primitive.ObjectIDFromHex(input.CreatedBy)
	if err != nil {
		return nil, err
	}

	var prescriptionID *primitive.ObjectID
	if input.PrescriptionID != "" {
		id, err := primitive.ObjectIDFromHex(input.PrescriptionID)
		if err != nil {
			return nil, errors.New("ID đơn thuốc không hợp lệ")
		}
		prescriptionID = &id
	}

	times, err := normalizeReminderTimes(input.Times)
	if err != nil {
		return nil, err
	}

	reminder := &domain.Reminder{
		PatientID:      patientID,
		Kind:           input.Kind,
		Message:        input.Message,
		Times:          times,
		DaysOfWeek:     input.DaysOfWeek,
		Timezone:       input.Timezone,
		Status:         domain.ReminderStatusActive,
		StartDate:      input.StartDate,
		EndDate:        input.EndDate,
		PrescriptionID: prescriptionID,
		TimeOfDay:      input.TimeOfDay,
		MealTiming:     input.MealTiming,
		CreatedBy:      createdByID,
	}

	createdReminder, err := s.reminderRepo.Create(ctx, reminder)
	if err != nil {
		return nil, err
	}

	fmt.Println("=======================", createdReminder.ID.Hex())

	err = client.StartReminderWorkflow(edto.ReminderWorkflowInput{
		ReminderID: createdReminder.ID.Hex(),
	})
	if err != nil {
		return nil, err
	}

	return &dto.ReminderResponse{
		ID:             createdReminder.ID.Hex(),
		PatientID:      createdReminder.PatientID.Hex(),
		Kind:           createdReminder.Kind,
		Message:        createdReminder.Message,
		Times:          createdReminder.Times,
		DaysOfWeek:     createdReminder.DaysOfWeek,
		Timezone:       createdReminder.Timezone,
		Status:         createdReminder.Status,
		StartDate:      createdReminder.StartDate,
		EndDate:        createdReminder.EndDate,
		PrescriptionID: objectIDToHex(createdReminder.PrescriptionID),
		TimeOfDay:      createdReminder.TimeOfDay,
		MealTiming:     createdReminder.MealTiming,
		CreatedBy:      createdReminder.CreatedBy.Hex(),
		CreatedAt:      createdReminder.CreatedAt,
		UpdatedAt:      createdReminder.UpdatedAt,
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

	return mapReminderResponses(reminders), nil
}

func (s *reminderService) GetMyReminders(ctx context.Context, input *usecase.GetMyRemindersInput) ([]dto.ReminderResponse, error) {
	if input.Role == userDomain.RoleAdmin {
		return s.GetReminders(ctx, &usecase.GetRemindersInput{
			PatientID: input.PatientID,
			Status:    input.Status,
			Kind:      input.Kind,
		})
	}

	userID, err := util.MustHexToObjectID(input.UserID)
	if err != nil {
		return nil, err
	}

	patientIDs, err := s.assignedPatientIDs(ctx, input.Role, userID)
	if err != nil {
		return nil, err
	}

	if input.PatientID != "" {
		patientID, err := util.MustHexToObjectID(input.PatientID)
		if err != nil {
			return nil, errors.New("ID bệnh nhân không hợp lệ")
		}
		if !containsObjectID(patientIDs, patientID) {
			return []dto.ReminderResponse{}, nil
		}
		patientIDs = []primitive.ObjectID{patientID}
	}

	reminders, err := s.reminderRepo.FindByPatientIDs(ctx, patientIDs, repository.ReminderFilter{
		Status: input.Status,
		Kind:   input.Kind,
	})
	if err != nil {
		return nil, err
	}

	return mapReminderResponses(reminders), nil
}

func (s *reminderService) assignedPatientIDs(ctx context.Context, role userDomain.Role, userID primitive.ObjectID) ([]primitive.ObjectID, error) {
	switch role {
	case userDomain.RolePatient:
		return []primitive.ObjectID{userID}, nil
	case userDomain.RoleDoctor:
		assignments, err := s.assignmentRepo.FindByDoctorID(ctx, userID)
		if err != nil {
			return nil, err
		}
		return assignmentPatientIDs(assignments), nil
	case userDomain.RoleNurse:
		assignments, _, err := s.assignmentRepo.FindByNurseIDWithNames(ctx, userID)
		if err != nil {
			return nil, err
		}
		return assignmentPatientIDs(assignments), nil
	default:
		return nil, errors.New("Không có quyền truy cập")
	}
}

func assignmentPatientIDs(assignments []*domain.Assignment) []primitive.ObjectID {
	patientIDs := make([]primitive.ObjectID, 0, len(assignments))
	for _, assignment := range assignments {
		if assignment == nil || assignment.PatientID.IsZero() {
			continue
		}
		patientIDs = append(patientIDs, assignment.PatientID)
	}
	return patientIDs
}

func containsObjectID(ids []primitive.ObjectID, target primitive.ObjectID) bool {
	for _, id := range ids {
		if id == target {
			return true
		}
	}
	return false
}

func mapReminderResponses(reminders []domain.Reminder) []dto.ReminderResponse {
	responses := make([]dto.ReminderResponse, 0, len(reminders))
	for _, reminder := range reminders {
		responses = append(responses, dto.ReminderResponse{
			ID:             reminder.ID.Hex(),
			PatientID:      reminder.PatientID.Hex(),
			Kind:           reminder.Kind,
			Message:        reminder.Message,
			Times:          reminder.Times,
			DaysOfWeek:     reminder.DaysOfWeek,
			Timezone:       reminder.Timezone,
			Status:         reminder.Status,
			StartDate:      reminder.StartDate,
			EndDate:        reminder.EndDate,
			PrescriptionID: objectIDToHex(reminder.PrescriptionID),
			TimeOfDay:      reminder.TimeOfDay,
			MealTiming:     reminder.MealTiming,
			CreatedBy:      reminder.CreatedBy.Hex(),
			CreatedAt:      reminder.CreatedAt,
			UpdatedAt:      reminder.UpdatedAt,
		})
	}
	return responses
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
		return nil, errors.New("Không tìm thấy nhắc nhở")
	}

	times, err := normalizeReminderTimes(input.Times)
	if err != nil {
		return nil, err
	}

	// Update fields
	existingReminder.Message = input.Message
	existingReminder.Status = input.Status
	existingReminder.Times = times
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
		ID:             updatedReminder.ID.Hex(),
		PatientID:      updatedReminder.PatientID.Hex(),
		Kind:           updatedReminder.Kind,
		Message:        updatedReminder.Message,
		Times:          updatedReminder.Times,
		DaysOfWeek:     updatedReminder.DaysOfWeek,
		Timezone:       updatedReminder.Timezone,
		Status:         updatedReminder.Status,
		StartDate:      updatedReminder.StartDate,
		EndDate:        updatedReminder.EndDate,
		PrescriptionID: objectIDToHex(updatedReminder.PrescriptionID),
		TimeOfDay:      updatedReminder.TimeOfDay,
		MealTiming:     updatedReminder.MealTiming,
		CreatedBy:      updatedReminder.CreatedBy.Hex(),
		CreatedAt:      updatedReminder.CreatedAt,
		UpdatedAt:      updatedReminder.UpdatedAt,
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
		return nil, errors.New("Không tìm thấy nhắc nhở")
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
		ID:             updatedReminder.ID.Hex(),
		PatientID:      updatedReminder.PatientID.Hex(),
		Kind:           updatedReminder.Kind,
		Message:        updatedReminder.Message,
		Times:          updatedReminder.Times,
		DaysOfWeek:     updatedReminder.DaysOfWeek,
		Timezone:       updatedReminder.Timezone,
		Status:         updatedReminder.Status,
		StartDate:      updatedReminder.StartDate,
		EndDate:        updatedReminder.EndDate,
		PrescriptionID: objectIDToHex(updatedReminder.PrescriptionID),
		TimeOfDay:      updatedReminder.TimeOfDay,
		MealTiming:     updatedReminder.MealTiming,
		CreatedBy:      updatedReminder.CreatedBy.Hex(),
		CreatedAt:      updatedReminder.CreatedAt,
		UpdatedAt:      updatedReminder.UpdatedAt,
	}, nil
}

func objectIDToHex(id *primitive.ObjectID) string {
	if id == nil {
		return ""
	}
	return id.Hex()
}

// normalizeReminderTimes cleans up requested reminder times: it validates the
// range, removes duplicates, and sorts them chronologically. It returns an
// error when no valid time remains.
func normalizeReminderTimes(times []domain.ReminderTime) ([]domain.ReminderTime, error) {
	seen := make(map[int]struct{}, len(times))
	normalized := make([]domain.ReminderTime, 0, len(times))
	for _, t := range times {
		if t.Hour < 0 || t.Hour > 23 || t.Minute < 0 || t.Minute > 59 {
			return nil, errors.New("Thời điểm nhắc không hợp lệ (giờ 0-23, phút 0-59)")
		}
		key := t.Hour*60 + t.Minute
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		normalized = append(normalized, t)
	}

	if len(normalized) == 0 {
		return nil, errors.New("Vui lòng chọn ít nhất một thời điểm nhắc")
	}

	sort.Slice(normalized, func(i, j int) bool {
		return normalized[i].Hour*60+normalized[i].Minute < normalized[j].Hour*60+normalized[j].Minute
	})

	return normalized, nil
}
