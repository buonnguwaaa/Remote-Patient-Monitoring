package service

import (
	"context"
	"errors"
	"fmt"
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

var (
	ErrMedicationIntakeNotFound     = errors.New("Không tìm thấy lịch sử uống thuốc")
	ErrMedicationSlotNotFound       = errors.New("Không tìm thấy lịch uống trong đơn thuốc")
	ErrPrescriptionNotActiveToday   = errors.New("Đơn thuốc không có hiệu lực trong ngày hôm nay")
	ErrMedicationIntakeAccessDenied = errors.New("Không có quyền truy cập")
)

type medicationIntakeService struct {
	patientRepo      userRepository.PatientRepository
	prescriptionRepo repository.PrescriptionRepository
	intakeRepo       repository.MedicationIntakeRepository
	reminderSync     *MedicationReminderSync
}

type MedicationIntakeService interface {
	CreateMedicationIntake(ctx context.Context, input *usecase.CreateMedicationIntakeInput) (*dto.MedicationIntakeResponse, error)
	GetTodayMedications(ctx context.Context, input *usecase.GetTodayMedicationsInput) ([]dto.TodayMedicationResponse, error)
	GetMedicationAdherence(ctx context.Context, input *usecase.GetMedicationAdherenceInput) (*dto.MedicationAdherenceResponse, error)
}

func NewMedicationIntakeService(
	patientRepo userRepository.PatientRepository,
	prescriptionRepo repository.PrescriptionRepository,
	intakeRepo repository.MedicationIntakeRepository,
	reminderRepo repository.ReminderRepository,
) MedicationIntakeService {
	return &medicationIntakeService{
		patientRepo:      patientRepo,
		prescriptionRepo: prescriptionRepo,
		intakeRepo:       intakeRepo,
		reminderSync:     NewMedicationReminderSync(reminderRepo, intakeRepo),
	}
}

func (s *medicationIntakeService) CreateMedicationIntake(ctx context.Context, input *usecase.CreateMedicationIntakeInput) (*dto.MedicationIntakeResponse, error) {
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("ID bệnh nhân không hợp lệ")
	}

	prescriptionID, err := primitive.ObjectIDFromHex(input.PrescriptionID)
	if err != nil {
		return nil, errors.New("ID đơn thuốc không hợp lệ")
	}

	prescription, err := s.prescriptionRepo.FindByID(ctx, prescriptionID)
	if err != nil {
		return nil, err
	}
	if prescription == nil {
		return nil, ErrPrescriptionNotFound
	}
	if prescription.PatientID != patientID {
		return nil, ErrMedicationIntakeAccessDenied
	}

	dose, err := findMedicationDose(prescription, input.DrugName, input.Dose)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	scheduled, _, err := isPrescriptionScheduledOnDate(prescription, now)
	if err != nil {
		return nil, err
	}
	if !scheduled {
		return nil, ErrPrescriptionNotActiveToday
	}

	scheduledDate, err := startOfDayInTimezone(now, prescription.Timezone)
	if err != nil {
		return nil, err
	}

	existing, err := s.intakeRepo.FindBySlot(ctx, patientID, prescriptionID, input.DrugName, dose, scheduledDate)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return s.finalizeIntake(ctx, prescription, existing)
	}

	intake := &domain.MedicationIntake{
		PatientID:      patientID,
		PrescriptionID: prescriptionID,
		DrugName:       input.DrugName,
		Dosage:         findMedicationDosage(prescription, input.DrugName),
		Dose:           dose,
		ScheduledDate:  scheduledDate,
		TakenAt:        now,
	}

	created, err := s.intakeRepo.Create(ctx, intake)
	if err != nil {
		if mongoIsDuplicateKeyError(err) {
			existing, findErr := s.intakeRepo.FindBySlot(ctx, patientID, prescriptionID, input.DrugName, dose, scheduledDate)
			if findErr != nil {
				return nil, findErr
			}
			if existing != nil {
				return s.finalizeIntake(ctx, prescription, existing)
			}
		}
		return nil, err
	}

	return s.finalizeIntake(ctx, prescription, created)
}

func (s *medicationIntakeService) finalizeIntake(ctx context.Context, prescription *domain.Prescription, intake *domain.MedicationIntake) (*dto.MedicationIntakeResponse, error) {
	if s.reminderSync != nil {
		s.reminderSync.SnoozeRemindersAfterIntake(
			ctx,
			prescription,
			intake.Dose,
			intake.ScheduledDate,
			intake.TakenAt,
		)
	}
	return toMedicationIntakeResponse(intake), nil
}

func (s *medicationIntakeService) GetTodayMedications(ctx context.Context, input *usecase.GetTodayMedicationsInput) ([]dto.TodayMedicationResponse, error) {
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("ID bệnh nhân không hợp lệ")
	}

	exists, err := s.patientRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient)
	if err != nil || !exists {
		return nil, errors.New("Không tìm thấy người dùng hoặc người dùng không phải bệnh nhân")
	}

	prescriptions, err := s.prescriptionRepo.FindWithFilter(ctx, repository.PrescriptionFilter{
		PatientID: input.PatientID,
		Status:    domain.PrescriptionStatusActive,
	})
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	var scheduledDates []time.Time
	scheduledDateByTimezone := map[string]time.Time{}

	responses := make([]dto.TodayMedicationResponse, 0)
	for _, prescription := range prescriptions {
		scheduled, scheduledDate, err := isPrescriptionScheduledOnDate(&prescription, now)
		if err != nil {
			return nil, err
		}
		if !scheduled {
			continue
		}

		if _, ok := scheduledDateByTimezone[prescription.Timezone]; !ok {
			scheduledDateByTimezone[prescription.Timezone] = scheduledDate
			scheduledDates = append(scheduledDates, scheduledDate)
		}

		for _, med := range prescription.Medications {
			slots := make([]dto.TodayMedicationSlotResponse, 0, len(med.Schedule))
			for _, dose := range med.Schedule {
				slots = append(slots, dto.TodayMedicationSlotResponse{
					MedicationDoseResponse: dto.ToMedicationDoseResponse(dose),
					Taken:                  false,
				})
			}

			responses = append(responses, dto.TodayMedicationResponse{
				PrescriptionID: prescription.ID.Hex(),
				DrugName:       med.DrugName,
				Dosage:         med.Dosage,
				ExpectedToday:  len(slots),
				TakenToday:     0,
				Slots:          slots,
			})
		}
	}

	if len(responses) == 0 {
		return []dto.TodayMedicationResponse{}, nil
	}

	intakeMap, err := s.loadIntakesForDates(ctx, input.PatientID, scheduledDates)
	if err != nil {
		return nil, err
	}

	for i := range responses {
		prescriptionID := responses[i].PrescriptionID
		scheduledDate := scheduledDateForPrescription(prescriptions, prescriptionID, scheduledDateByTimezone)
		takenCount := 0
		for j := range responses[i].Slots {
			dose := domain.MedicationDose{
				TimeOfDay:  responses[i].Slots[j].TimeOfDay,
				MealTiming: responses[i].Slots[j].MealTiming,
				PillCount:  responses[i].Slots[j].PillCount,
			}
			key := intakeDaySlotKey(prescriptionID, responses[i].DrugName, dose, scheduledDate)
			if intake, ok := intakeMap[key]; ok {
				responses[i].Slots[j].Taken = true
				responses[i].Slots[j].IntakeID = intake.ID.Hex()
				takenCount++
			}
		}
		responses[i].TakenToday = takenCount
	}

	return responses, nil
}

func (s *medicationIntakeService) GetMedicationAdherence(ctx context.Context, input *usecase.GetMedicationAdherenceInput) (*dto.MedicationAdherenceResponse, error) {
	patientID, err := primitive.ObjectIDFromHex(input.PatientID)
	if err != nil {
		return nil, errors.New("ID bệnh nhân không hợp lệ")
	}

	exists, err := s.patientRepo.ExistsByIDAndRole(ctx, patientID, userDomain.RolePatient)
	if err != nil || !exists {
		return nil, errors.New("Không tìm thấy người dùng hoặc người dùng không phải bệnh nhân")
	}

	prescriptions, err := s.prescriptionRepo.FindWithFilter(ctx, repository.PrescriptionFilter{
		PatientID: input.PatientID,
	})
	if err != nil {
		return nil, err
	}

	prescriptions = filterPrescriptionsForAdherence(prescriptions)
	if len(prescriptions) == 0 {
		return emptyAdherenceResponse(), nil
	}

	refTZ := prescriptions[0].Timezone
	from, to, err := resolveAdherenceRange(input, refTZ)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	intakeMap, err := s.loadIntakesInRange(ctx, input.PatientID, from, to)
	if err != nil {
		return nil, err
	}

	dayMap := map[string]*dto.MedicationAdherenceDayResponse{}
	summary := dto.MedicationAdherenceSummaryResponse{}

	loc, err := time.LoadLocation(refTZ)
	if err != nil {
		return nil, err
	}

	for day := from.In(loc); !day.After(to.In(loc)); day = day.AddDate(0, 0, 1) {
		dateLabel := day.Format("2006-01-02")
		dayResponse := &dto.MedicationAdherenceDayResponse{
			Date:        dateLabel,
			Medications: []dto.MedicationAdherenceMedicationResponse{},
		}

		for _, prescription := range prescriptions {
			scheduled, scheduledDate, err := isPrescriptionScheduledOnDate(&prescription, day)
			if err != nil {
				return nil, err
			}
			if !scheduled {
				continue
			}

			prescriptionLoc, err := time.LoadLocation(prescription.Timezone)
			if err != nil {
				return nil, err
			}

			for _, med := range prescription.Medications {
				medResponse := dto.MedicationAdherenceMedicationResponse{
					PrescriptionID: prescription.ID.Hex(),
					DrugName:       med.DrugName,
					Dosage:         med.Dosage,
					Slots:          make([]dto.MedicationAdherenceSlotResponse, 0, len(med.Schedule)),
				}

				for _, dose := range med.Schedule {
					slot := dto.MedicationAdherenceSlotResponse{
						MedicationDoseResponse: dto.ToMedicationDoseResponse(dose),
					}

					key := intakeDaySlotKey(prescription.ID.Hex(), med.DrugName, dose, scheduledDate)
					if intake, ok := intakeMap[key]; ok {
						slot.Status = dto.AdherenceSlotTaken
						slot.IntakeID = intake.ID.Hex()
						takenAt := intake.TakenAt
						slot.TakenAt = &takenAt
						medResponse.Taken++
					} else {
						slot.Status = adherenceSlotStatusWithoutIntake(scheduledDate, dose, prescription.Timezone, now, prescriptionLoc)
						if slot.Status == dto.AdherenceSlotMissed {
							medResponse.Missed++
						}
					}

					medResponse.Expected++
					medResponse.Slots = append(medResponse.Slots, slot)
				}

				if medResponse.Expected > 0 {
					dayResponse.Medications = append(dayResponse.Medications, medResponse)
					dayResponse.Expected += medResponse.Expected
					dayResponse.Taken += medResponse.Taken
					dayResponse.Missed += medResponse.Missed
				}
			}
		}

		if dayResponse.Expected > 0 {
			dayMap[dateLabel] = dayResponse
			summary.Expected += dayResponse.Expected
			summary.Taken += dayResponse.Taken
			summary.Missed += dayResponse.Missed
		}
	}

	days := make([]dto.MedicationAdherenceDayResponse, 0, len(dayMap))
	for day := from.In(loc); !day.After(to.In(loc)); day = day.AddDate(0, 0, 1) {
		if d, ok := dayMap[day.Format("2006-01-02")]; ok {
			days = append(days, *d)
		}
	}

	if summary.Expected > 0 {
		summary.AdherenceRate = float64(summary.Taken) / float64(summary.Expected)
	}

	return &dto.MedicationAdherenceResponse{
		From:    from.In(loc).Format("2006-01-02"),
		To:      to.In(loc).Format("2006-01-02"),
		Summary: summary,
		Days:    days,
	}, nil
}

func filterPrescriptionsForAdherence(prescriptions []domain.Prescription) []domain.Prescription {
	filtered := make([]domain.Prescription, 0, len(prescriptions))
	for _, p := range prescriptions {
		if p.Status != domain.PrescriptionStatusDiscontinued {
			filtered = append(filtered, p)
		}
	}
	return filtered
}

func resolveAdherenceRange(input *usecase.GetMedicationAdherenceInput, timezone string) (time.Time, time.Time, error) {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("múi giờ không hợp lệ: %w", err)
	}

	if input.From != nil && input.To != nil {
		from, err := startOfDayInTimezone(*input.From, timezone)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		to, err := startOfDayInTimezone(*input.To, timezone)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		if to.Before(from) {
			return time.Time{}, time.Time{}, errors.New("Thời điểm kết thúc phải sau hoặc bằng thời điểm bắt đầu")
		}
		return from, to, nil
	}

	days := input.Days
	if days <= 0 {
		days = 7
	}
	if days > 90 {
		days = 90
	}

	now := time.Now().In(loc)
	to, err := startOfDayInTimezone(now, timezone)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	from := to.AddDate(0, 0, -(days - 1))
	return from, to, nil
}

func emptyAdherenceResponse() *dto.MedicationAdherenceResponse {
	return &dto.MedicationAdherenceResponse{
		Summary: dto.MedicationAdherenceSummaryResponse{},
		Days:    []dto.MedicationAdherenceDayResponse{},
	}
}

func adherenceSlotStatusWithoutIntake(
	scheduledDate time.Time,
	dose domain.MedicationDose,
	timezone string,
	now time.Time,
	loc *time.Location,
) dto.MedicationAdherenceSlotStatus {
	todayStart, err := startOfDayInTimezone(now, timezone)
	if err != nil {
		return dto.AdherenceSlotMissed
	}

	if scheduledDate.Before(todayStart) {
		return dto.AdherenceSlotMissed
	}
	if scheduledDate.After(todayStart) {
		return dto.AdherenceSlotMissed
	}

	hour, minute := domain.DoseClock(dose)
	localScheduled := scheduledDate.In(loc)
	slotTime := time.Date(
		localScheduled.Year(), localScheduled.Month(), localScheduled.Day(),
		hour, minute, 0, 0, loc,
	)
	if now.In(loc).Before(slotTime) {
		return dto.AdherenceSlotPending
	}
	return dto.AdherenceSlotMissed
}

func scheduledDateForPrescription(
	prescriptions []domain.Prescription,
	prescriptionID string,
	byTimezone map[string]time.Time,
) time.Time {
	for _, p := range prescriptions {
		if p.ID.Hex() == prescriptionID {
			return byTimezone[p.Timezone]
		}
	}
	return time.Time{}
}

func findMedicationDose(prescription *domain.Prescription, drugName string, requested domain.MedicationDose) (domain.MedicationDose, error) {
	for _, med := range prescription.Medications {
		if med.DrugName != drugName {
			continue
		}
		for _, dose := range med.Schedule {
			if dose.Matches(requested) {
				return dose, nil
			}
		}
	}
	return domain.MedicationDose{}, ErrMedicationSlotNotFound
}

func findMedicationDosage(prescription *domain.Prescription, drugName string) string {
	for _, med := range prescription.Medications {
		if med.DrugName == drugName {
			return med.Dosage
		}
	}
	return ""
}

func isPrescriptionScheduledOnDate(prescription *domain.Prescription, day time.Time) (bool, time.Time, error) {
	if prescription.Status == domain.PrescriptionStatusDiscontinued {
		return false, time.Time{}, nil
	}

	scheduledDate, err := startOfDayInTimezone(day, prescription.Timezone)
	if err != nil {
		return false, time.Time{}, err
	}

	loc, err := time.LoadLocation(prescription.Timezone)
	if err != nil {
		loc = time.UTC
	}

	localDay := scheduledDate.In(loc)
	if localDay.Before(prescription.StartDate.In(loc)) {
		return false, scheduledDate, nil
	}

	endDate := effectivePrescriptionEndDate(prescription.EndDate, prescription.StartDate)
	if !localDay.Before(endDate.In(loc)) {
		return false, scheduledDate, nil
	}

	weekday := int(localDay.Weekday())
	for _, d := range prescription.DaysOfWeek {
		if d == weekday {
			return true, scheduledDate, nil
		}
	}

	return false, scheduledDate, nil
}

func effectivePrescriptionEndDate(end *time.Time, start time.Time) time.Time {
	if end != nil {
		return *end
	}
	return start.AddDate(1, 0, 0)
}

func startOfDayInTimezone(t time.Time, timezone string) (time.Time, error) {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.Time{}, fmt.Errorf("múi giờ không hợp lệ: %w", err)
	}

	local := t.In(loc)
	y, m, d := local.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc).UTC(), nil
}

func intakeDaySlotKey(prescriptionID, drugName string, dose domain.MedicationDose, scheduledDate time.Time) string {
	return fmt.Sprintf("%s|%s|%s|%s|%v|%d", prescriptionID, drugName, dose.TimeOfDay, dose.MealTiming, dose.PillCount, scheduledDate.Unix())
}

func (s *medicationIntakeService) loadIntakesForDates(ctx context.Context, patientID string, scheduledDates []time.Time) (map[string]domain.MedicationIntake, error) {
	result := make(map[string]domain.MedicationIntake)

	for _, scheduledDate := range scheduledDates {
		intakes, err := s.intakeRepo.FindWithFilter(ctx, repository.MedicationIntakeFilter{
			PatientID:     patientID,
			ScheduledDate: &scheduledDate,
		})
		if err != nil {
			return nil, err
		}

		for _, intake := range intakes {
			key := intakeDaySlotKey(
				intake.PrescriptionID.Hex(),
				intake.DrugName,
				intake.Dose,
				intake.ScheduledDate,
			)
			result[key] = intake
		}
	}

	return result, nil
}

func (s *medicationIntakeService) loadIntakesInRange(ctx context.Context, patientID string, from, to time.Time) (map[string]domain.MedicationIntake, error) {
	intakes, err := s.intakeRepo.FindWithFilter(ctx, repository.MedicationIntakeFilter{
		PatientID:     patientID,
		ScheduledFrom: &from,
		ScheduledTo:   &to,
	})
	if err != nil {
		return nil, err
	}

	result := make(map[string]domain.MedicationIntake, len(intakes))
	for _, intake := range intakes {
		key := intakeDaySlotKey(
			intake.PrescriptionID.Hex(),
			intake.DrugName,
			intake.Dose,
			intake.ScheduledDate,
		)
		result[key] = intake
	}

	return result, nil
}

func toMedicationIntakeResponse(intake *domain.MedicationIntake) *dto.MedicationIntakeResponse {
	return &dto.MedicationIntakeResponse{
		ID:             intake.ID.Hex(),
		PatientID:      intake.PatientID.Hex(),
		PrescriptionID: intake.PrescriptionID.Hex(),
		DrugName:       intake.DrugName,
		Dosage:         intake.Dosage,
		Dose:           dto.ToMedicationDoseResponse(intake.Dose),
		ScheduledDate:  intake.ScheduledDate,
		TakenAt:        intake.TakenAt,
		CreatedAt:      intake.CreatedAt,
	}
}

func mongoIsDuplicateKeyError(err error) bool {
	return mongo.IsDuplicateKeyError(err)
}
