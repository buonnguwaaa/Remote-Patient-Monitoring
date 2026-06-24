package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
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

var (
	ErrPrescriptionNotFound     = errors.New("prescription not found")
	ErrPrescriptionAccessDenied = errors.New("access denied")
)

type prescriptionService struct {
	patientRepo      userRepository.PatientRepository
	prescriptionRepo repository.PrescriptionRepository
	reminderRepo     repository.ReminderRepository
	reminderService  ReminderService
}

type PrescriptionService interface {
	CreatePrescription(ctx context.Context, input *usecase.CreatePrescriptionInput) (*dto.PrescriptionResponse, error)
	GetPrescriptions(ctx context.Context, input *usecase.GetPrescriptionsInput) ([]dto.PrescriptionResponse, error)
	GetPrescriptionByID(ctx context.Context, input *usecase.GetPrescriptionByIDInput) (*dto.PrescriptionResponse, error)
	UpdatePrescriptionByID(ctx context.Context, input *usecase.UpdatePrescriptionInput) (*dto.PrescriptionResponse, error)
	UpdatePrescriptionStatus(ctx context.Context, input *usecase.UpdatePrescriptionStatusInput) (*dto.PrescriptionResponse, error)
}

func NewPrescriptionService(
	patientRepo userRepository.PatientRepository,
	prescriptionRepo repository.PrescriptionRepository,
	reminderRepo repository.ReminderRepository,
	reminderService ReminderService,
) PrescriptionService {
	return &prescriptionService{
		patientRepo:      patientRepo,
		prescriptionRepo: prescriptionRepo,
		reminderRepo:     reminderRepo,
		reminderService:  reminderService,
	}
}

func (s *prescriptionService) CreatePrescription(ctx context.Context, input *usecase.CreatePrescriptionInput) (*dto.PrescriptionResponse, error) {
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("invalid patient ID")
	}

	if err := s.ensurePatient(ctx, patientID); err != nil {
		return nil, err
	}
	if err := validatePrescriptionInput(input.Medications, input.Timezone, input.DaysOfWeek); err != nil {
		return nil, err
	}

	prescribedByID, err := primitive.ObjectIDFromHex(input.PrescribedBy)
	if err != nil {
		return nil, err
	}

	created, err := s.prescriptionRepo.Create(ctx, &domain.Prescription{
		PatientID:    patientID,
		PrescribedBy: prescribedByID,
		Medications:  input.Medications,
		Timezone:     input.Timezone,
		DaysOfWeek:   input.DaysOfWeek,
		StartDate:    input.StartDate,
		EndDate:      input.EndDate,
		Status:       domain.PrescriptionStatusActive,
	})
	if err != nil {
		return nil, err
	}

	endDate := prescriptionEndDate(input.EndDate, input.StartDate)
	reminderIDs, err := s.createMedicationReminders(ctx, created, input.PrescribedBy, endDate)
	if err != nil {
		s.rollbackPrescriptionCreation(ctx, created.ID, reminderIDs)
		return nil, fmt.Errorf("failed to create medication reminders: %w", err)
	}

	return toPrescriptionResponse(created), nil
}

func (s *prescriptionService) GetPrescriptions(ctx context.Context, input *usecase.GetPrescriptionsInput) ([]dto.PrescriptionResponse, error) {
	prescriptions, err := s.prescriptionRepo.FindWithFilter(ctx, repository.PrescriptionFilter{
		PatientID:    input.PatientID,
		Status:       input.Status,
		IsLatest:     input.IsLatest,
		DoctorID:     input.DoctorID,
		NurseID:      input.NurseID,
		PrescribedBy: input.PrescribedBy,
	})
	if err != nil {
		return nil, err
	}

	prescriptions, err = s.expirePrescriptionsIfNeeded(ctx, prescriptions)
	if err != nil {
		return nil, err
	}

	return toPrescriptionResponses(prescriptions), nil
}

func (s *prescriptionService) GetPrescriptionByID(ctx context.Context, input *usecase.GetPrescriptionByIDInput) (*dto.PrescriptionResponse, error) {
	prescriptionID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	prescription, err := s.requirePrescription(ctx, prescriptionID)
	if err != nil {
		return nil, err
	}

	if err := s.ensurePatientAccess(input.Role, input.UserID, prescription.PatientID); err != nil {
		return nil, err
	}

	return toPrescriptionResponse(prescription), nil
}

func (s *prescriptionService) UpdatePrescriptionByID(ctx context.Context, input *usecase.UpdatePrescriptionInput) (*dto.PrescriptionResponse, error) {
	prescriptionID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}
	if err := validatePrescriptionInput(input.Medications, input.Timezone, input.DaysOfWeek); err != nil {
		return nil, err
	}

	existing, err := s.requirePrescription(ctx, prescriptionID)
	if err != nil {
		return nil, err
	}

	previousStatus := existing.Status
	existing.Medications = input.Medications
	existing.Timezone = input.Timezone
	existing.DaysOfWeek = input.DaysOfWeek
	existing.StartDate = input.StartDate
	existing.EndDate = input.EndDate
	existing.Status = input.Status

	updated, err := s.prescriptionRepo.Update(ctx, existing)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrPrescriptionNotFound
	}

	updated, err = s.expirePrescriptionIfNeeded(ctx, updated)
	if err != nil {
		return nil, err
	}

	if updated.Status != previousStatus {
		if err := s.applyPrescriptionStatusToLinkedReminders(ctx, prescriptionID, updated.Status); err != nil {
			return nil, fmt.Errorf("prescription status updated but failed to update linked reminders: %w", err)
		}
	} else if updated.Status == domain.PrescriptionStatusActive {
		if err := s.syncPrescriptionReminders(ctx, updated); err != nil {
			return nil, fmt.Errorf("prescription updated but failed to sync linked reminders: %w", err)
		}
	}

	return toPrescriptionResponse(updated), nil
}

func (s *prescriptionService) UpdatePrescriptionStatus(ctx context.Context, input *usecase.UpdatePrescriptionStatusInput) (*dto.PrescriptionResponse, error) {
	prescriptionID, err := util.MustHexToObjectID(input.ID)
	if err != nil {
		return nil, err
	}

	existing, err := s.requirePrescription(ctx, prescriptionID)
	if err != nil {
		return nil, err
	}
	if existing.Status == input.Status {
		return toPrescriptionResponse(existing), nil
	}

	previousStatus := existing.Status
	updated, err := s.prescriptionRepo.UpdateStatusByID(ctx, prescriptionID, input.Status)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, ErrPrescriptionNotFound
	}

	updated, err = s.expirePrescriptionIfNeeded(ctx, updated)
	if err != nil {
		return nil, err
	}

	if updated.Status != previousStatus {
		if err := s.applyPrescriptionStatusToLinkedReminders(ctx, prescriptionID, updated.Status); err != nil {
			return nil, fmt.Errorf("prescription status updated but failed to update linked reminders: %w", err)
		}
	}

	return toPrescriptionResponse(updated), nil
}

func (s *prescriptionService) ensurePatient(ctx context.Context, patientID primitive.ObjectID) error {
	exists, err := s.patientRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient)
	if err != nil || !exists {
		return errors.New("user not found or not patient")
	}
	return nil
}

func (s *prescriptionService) requirePrescription(ctx context.Context, id primitive.ObjectID) (*domain.Prescription, error) {
	prescription, err := s.prescriptionRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if prescription == nil {
		return nil, ErrPrescriptionNotFound
	}
	return s.expirePrescriptionIfNeeded(ctx, prescription)
}

func (s *prescriptionService) expirePrescriptionsIfNeeded(ctx context.Context, prescriptions []domain.Prescription) ([]domain.Prescription, error) {
	for i := range prescriptions {
		updated, err := s.expirePrescriptionIfNeeded(ctx, &prescriptions[i])
		if err != nil {
			return nil, err
		}
		if updated != nil {
			prescriptions[i] = *updated
		}
	}
	return prescriptions, nil
}

func (s *prescriptionService) expirePrescriptionIfNeeded(ctx context.Context, prescription *domain.Prescription) (*domain.Prescription, error) {
	if prescription.Status != domain.PrescriptionStatusActive {
		return prescription, nil
	}
	if !isPrescriptionPastEnd(prescription, time.Now().UTC()) {
		return prescription, nil
	}

	updated, err := s.prescriptionRepo.UpdateStatusByID(ctx, prescription.ID, domain.PrescriptionStatusExpired)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return prescription, nil
	}

	if err := s.applyPrescriptionStatusToLinkedReminders(ctx, prescription.ID, domain.PrescriptionStatusExpired); err != nil {
		return nil, err
	}

	return updated, nil
}

func isPrescriptionPastEnd(prescription *domain.Prescription, now time.Time) bool {
	return !now.Before(prescriptionEndDate(prescription.EndDate, prescription.StartDate))
}

func (s *prescriptionService) ensurePatientAccess(role userDomain.Role, userID string, patientID primitive.ObjectID) error {
	if role != userDomain.RolePatient {
		return nil
	}

	id, err := util.MustHexToObjectID(userID)
	if err != nil {
		return err
	}
	if patientID != id {
		return ErrPrescriptionAccessDenied
	}
	return nil
}

func (s *prescriptionService) rollbackPrescriptionCreation(ctx context.Context, prescriptionID primitive.ObjectID, reminderIDs []primitive.ObjectID) {
	s.cancelReminders(ctx, reminderIDs)
	_ = s.prescriptionRepo.DeleteByID(ctx, prescriptionID)
}

func (s *prescriptionService) createMedicationReminders(
	ctx context.Context,
	prescription *domain.Prescription,
	prescribedBy string,
	endDate time.Time,
) ([]primitive.ObjectID, error) {
	var reminderIDs []primitive.ObjectID

	for _, slot := range groupReminderSlots(prescription.Medications) {
		timeOfDay := slot.timeOfDay
		reminder, err := s.reminderService.CreateReminder(ctx, &usecase.CreateReminderInput{
			PatientID:      prescription.PatientID.Hex(),
			Kind:           domain.KindMedication,
			Message:        strings.Join(slot.messages, "; "),
			Hour:           slot.hour,
			Minute:         slot.minute,
			DaysOfWeek:     prescription.DaysOfWeek,
			Timezone:       prescription.Timezone,
			StartDate:      prescription.StartDate,
			EndDate:        endDate,
			CreatedBy:      prescribedBy,
			PrescriptionID: prescription.ID.Hex(),
			TimeOfDay:      &timeOfDay,
			MealTiming:     slot.mealTiming,
		})
		if err != nil {
			return reminderIDs, err
		}

		reminderID, err := primitive.ObjectIDFromHex(reminder.ID)
		if err != nil {
			return reminderIDs, err
		}
		reminderIDs = append(reminderIDs, reminderID)
	}

	return reminderIDs, nil
}

func (s *prescriptionService) cancelReminders(ctx context.Context, reminderIDs []primitive.ObjectID) {
	for _, id := range reminderIDs {
		_, _ = s.reminderService.UpdateReminderStatus(ctx, &usecase.UpdateReminderStatusInput{
			ID:     id.Hex(),
			Status: domain.ReminderStatusCanceled,
		})
	}
}

func (s *prescriptionService) applyPrescriptionStatusToLinkedReminders(ctx context.Context, prescriptionID primitive.ObjectID, status domain.PrescriptionStatus) error {
	reminderStatus, ok := domain.ReminderStatusForPrescription(status)
	if !ok {
		return fmt.Errorf("unsupported prescription status: %s", status)
	}

	reminders, err := s.reminderRepo.FindWithFilter(ctx, repository.ReminderFilter{
		PrescriptionID: prescriptionID.Hex(),
		Kind:           domain.KindMedication,
	})
	if err != nil {
		return err
	}

	for _, reminder := range reminders {
		if reminder.Status == reminderStatus {
			continue
		}
		if _, err := s.reminderService.UpdateReminderStatus(ctx, &usecase.UpdateReminderStatusInput{
			ID:     reminder.ID.Hex(),
			Status: reminderStatus,
		}); err != nil {
			return fmt.Errorf("failed to update linked reminder %s: %w", reminder.ID.Hex(), err)
		}
	}

	return nil
}

func (s *prescriptionService) syncPrescriptionReminders(ctx context.Context, prescription *domain.Prescription) error {
	reminders, err := s.reminderRepo.FindWithFilter(ctx, repository.ReminderFilter{
		PrescriptionID: prescription.ID.Hex(),
		Kind:           domain.KindMedication,
	})
	if err != nil {
		return err
	}

	for _, r := range reminders {
		if r.Status != domain.ReminderStatusCanceled {
			if _, err := s.reminderService.UpdateReminderStatus(ctx, &usecase.UpdateReminderStatusInput{
				ID:     r.ID.Hex(),
				Status: domain.ReminderStatusCanceled,
			}); err != nil {
				return fmt.Errorf("failed to cancel old reminder %s: %w", r.ID.Hex(), err)
			}
		}
	}

	endDate := prescriptionEndDate(prescription.EndDate, prescription.StartDate)
	_, err = s.createMedicationReminders(ctx, prescription, prescription.PrescribedBy.Hex(), endDate)
	return err
}

type reminderSlot struct {
	timeOfDay  domain.TimeOfDay
	hour       int
	minute     int
	messages   []string
	mealTiming *domain.MealTiming
}

type doseSlotKey struct {
	timeOfDay domain.TimeOfDay
	hour      int
	minute    int
}

func groupReminderSlots(medications []domain.PrescriptionMedication) []reminderSlot {
	accumulators := make(map[doseSlotKey]*reminderSlotAccumulator)

	for _, med := range medications {
		for _, dose := range med.Schedule {
			hour, minute := domain.DoseClock(dose)
			key := doseSlotKey{timeOfDay: dose.TimeOfDay, hour: hour, minute: minute}
			acc, ok := accumulators[key]
			if !ok {
				acc = &reminderSlotAccumulator{mealTimings: make(map[domain.MealTiming]struct{})}
				accumulators[key] = acc
			}
			acc.add(med, dose)
		}
	}

	slots := make([]reminderSlot, 0, len(accumulators))
	keys := make([]doseSlotKey, 0, len(accumulators))
	for key := range accumulators {
		keys = append(keys, key)
	}
	sortDoseSlotKeys(keys)

	for _, key := range keys {
		acc := accumulators[key]
		slots = append(slots, acc.slot(key))
	}

	return slots
}

func sortDoseSlotKeys(keys []doseSlotKey) {
	timeOfDayRank := map[domain.TimeOfDay]int{
		domain.TimeOfDayMorning: 0,
		domain.TimeOfDayNoon:    1,
		domain.TimeOfDayEvening: 2,
	}

	for i := 0; i < len(keys); i++ {
		for j := i + 1; j < len(keys); j++ {
			if doseSlotKeyLess(keys[j], keys[i], timeOfDayRank) {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}
}

func doseSlotKeyLess(a, b doseSlotKey, rank map[domain.TimeOfDay]int) bool {
	if rank[a.timeOfDay] != rank[b.timeOfDay] {
		return rank[a.timeOfDay] < rank[b.timeOfDay]
	}
	if a.hour != b.hour {
		return a.hour < b.hour
	}
	return a.minute < b.minute
}

type reminderSlotAccumulator struct {
	messages    []string
	mealTimings map[domain.MealTiming]struct{}
	hasUntimed  bool
}

func (a *reminderSlotAccumulator) add(med domain.PrescriptionMedication, dose domain.MedicationDose) {
	a.messages = append(a.messages, formatDoseReminderMessage(med, dose))
	if dose.MealTiming == "" {
		a.hasUntimed = true
		return
	}
	a.mealTimings[dose.MealTiming] = struct{}{}
}

func (a *reminderSlotAccumulator) slot(key doseSlotKey) reminderSlot {
	return reminderSlot{
		timeOfDay:  key.timeOfDay,
		hour:       key.hour,
		minute:     key.minute,
		messages:   a.messages,
		mealTiming: unifyMealTiming(a.mealTimings, a.hasUntimed),
	}
}

func unifyMealTiming(mealTimings map[domain.MealTiming]struct{}, hasUntimed bool) *domain.MealTiming {
	if hasUntimed || len(mealTimings) != 1 {
		return nil
	}
	for timing := range mealTimings {
		return mealTimingPtr(timing)
	}
	return nil
}

func validatePrescriptionInput(medications []domain.PrescriptionMedication, timezone string, daysOfWeek []int) error {
	if err := validateMedications(medications); err != nil {
		return err
	}
	return validateSchedule(timezone, daysOfWeek)
}

func validateSchedule(timezone string, daysOfWeek []int) error {
	if timezone == "" {
		return errors.New("timezone is required")
	}
	if _, err := time.LoadLocation(timezone); err != nil {
		return errors.New("invalid timezone")
	}
	if len(daysOfWeek) == 0 {
		return errors.New("at least one day of week is required")
	}
	for _, day := range daysOfWeek {
		if day < 0 || day > 6 {
			return errors.New("daysOfWeek values must be between 0 (Sunday) and 6 (Saturday)")
		}
	}
	return nil
}

func validateMedications(medications []domain.PrescriptionMedication) error {
	if len(medications) == 0 {
		return errors.New("at least one medication is required")
	}

	for i, med := range medications {
		if med.DrugName == "" {
			return fmt.Errorf("Thuốc thứ %d: tên thuốc không được để trống", i+1)
		}
		if len(med.Schedule) == 0 {
			return fmt.Errorf("Thuốc thứ %d: cần ít nhất một lịch uống thuốc", i+1)
		}

		seen := make(map[string]struct{})
		for j, dose := range med.Schedule {
			if dose.PillCount <= 0 {
				return fmt.Errorf("Thuốc thứ %d, cữ thứ %d: số lượng viên phải lớn hơn 0", i+1, j+1)
			}
			if err := domain.ValidateDoseTime(dose); err != nil {
				return fmt.Errorf("Thuốc thứ %d, cữ thứ %d: %w", i+1, j+1, err)
			}
			switch dose.MealTiming {
			case "", domain.MealTimingPreMeal, domain.MealTimingPostMeal:
			default:
				return fmt.Errorf("Thuốc thứ %d, cữ thứ %d: thời điểm ăn không hợp lệ", i+1, j+1)
			}

			hour, minute := domain.DoseClock(dose)
			key := fmt.Sprintf("%s:%s:%02d:%02d", dose.TimeOfDay, dose.MealTiming, hour, minute)
			if _, dup := seen[key]; dup {
				var todVN string
				switch dose.TimeOfDay {
				case "morning":
					todVN = "Sáng"
				case "noon":
					todVN = "Trưa"
				case "evening":
					todVN = "Tối"
				default:
					todVN = string(dose.TimeOfDay)
				}
				return fmt.Errorf("Thuốc thứ %d: bị trùng lịch uống thuốc (Buổi %s, %s)", i+1, todVN, domain.FormatClock(hour, minute))
			}
			seen[key] = struct{}{}
		}
	}

	return nil
}

func formatDoseReminderMessage(med domain.PrescriptionMedication, dose domain.MedicationDose) string {
	suffix := ""
	if label := domain.MealTimingLabel(dose.MealTiming); label != "" {
		suffix = " " + label
	}
	return fmt.Sprintf("Take %s %s (%s)%s", formatPillCount(dose.PillCount), med.DrugName, med.Dosage, suffix)
}

func mealTimingPtr(m domain.MealTiming) *domain.MealTiming {
	if m == "" {
		return nil
	}
	return &m
}

func formatPillCount(count float64) string {
	if count == float64(int(count)) {
		return strconv.Itoa(int(count))
	}
	return strconv.FormatFloat(count, 'f', -1, 64)
}

func prescriptionEndDate(end *time.Time, start time.Time) time.Time {
	if end != nil {
		return *end
	}
	return start.AddDate(1, 0, 0)
}

func toPrescriptionResponse(p *domain.Prescription) *dto.PrescriptionResponse {
	return &dto.PrescriptionResponse{
		ID:           p.ID.Hex(),
		PatientID:    p.PatientID.Hex(),
		PrescribedBy: p.PrescribedBy.Hex(),
		Medications:  toMedicationResponses(p.Medications),
		Timezone:     p.Timezone,
		DaysOfWeek:   p.DaysOfWeek,
		StartDate:    p.StartDate,
		EndDate:      p.EndDate,
		Status:       p.Status,
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
	}
}

func toPrescriptionResponses(prescriptions []domain.Prescription) []dto.PrescriptionResponse {
	responses := make([]dto.PrescriptionResponse, len(prescriptions))
	for i := range prescriptions {
		responses[i] = *toPrescriptionResponse(&prescriptions[i])
	}
	return responses
}

func toMedicationResponses(medications []domain.PrescriptionMedication) []dto.PrescriptionMedicationResponse {
	responses := make([]dto.PrescriptionMedicationResponse, len(medications))
	for i, med := range medications {
		schedule := make([]dto.MedicationDoseResponse, len(med.Schedule))
		for j, dose := range med.Schedule {
			schedule[j] = dto.ToMedicationDoseResponse(dose)
		}
		responses[i] = dto.PrescriptionMedicationResponse{
			DrugName:     med.DrugName,
			Dosage:       med.Dosage,
			Route:        med.Route,
			Instructions: med.Instructions,
			Schedule:     schedule,
		}
	}
	return responses
}
