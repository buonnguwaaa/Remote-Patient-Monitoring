package service

import (
	"context"
	"log"
	"time"

	temporalclient "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
)

type MedicationReminderSync struct {
	reminderRepo repository.ReminderRepository
	intakeRepo   repository.MedicationIntakeRepository
}

func NewMedicationReminderSync(
	reminderRepo repository.ReminderRepository,
	intakeRepo repository.MedicationIntakeRepository,
) *MedicationReminderSync {
	return &MedicationReminderSync{
		reminderRepo: reminderRepo,
		intakeRepo:   intakeRepo,
	}
}

// SnoozeRemindersAfterIntake skips upcoming reminder fires for the same time-of-day
// bucket when every dose in that bucket is already taken before the reminder time.
func (s *MedicationReminderSync) SnoozeRemindersAfterIntake(
	ctx context.Context,
	prescription *domain.Prescription,
	timeOfDay domain.TimeOfDay,
	scheduledDate time.Time,
	takenAt time.Time,
) {
	if prescription == nil || s.reminderRepo == nil || s.intakeRepo == nil {
		return
	}

	allTaken, err := allDosesTakenForTimeOfDay(ctx, s.intakeRepo, prescription, timeOfDay, scheduledDate)
	if err != nil || !allTaken {
		return
	}

	reminders, err := s.reminderRepo.FindWithFilter(ctx, repository.ReminderFilter{
		PrescriptionID: prescription.ID.Hex(),
		Kind:           domain.KindMedication,
		Status:         domain.ReminderStatusActive,
	})
	if err != nil {
		log.Printf("[WARN] failed to load medication reminders for snooze: %v", err)
		return
	}

	for _, reminder := range reminders {
		reminderTimeOfDay, ok := domain.ReminderTimeOfDay(&reminder)
		if !ok || reminderTimeOfDay != timeOfDay {
			continue
		}

		slotTime, err := domain.ReminderSlotTime(scheduledDate, prescription.Timezone, reminder.Hour, reminder.Minute)
		if err != nil {
			log.Printf("[WARN] failed to resolve reminder slot time: %v", err)
			continue
		}
		if !takenAt.Before(slotTime) {
			continue
		}

		if err := temporalclient.SignalReminderSkipOccurrence(ctx, reminder.ID.Hex()); err != nil {
			log.Printf("[WARN] failed to snooze reminder %s: %v", reminder.ID.Hex(), err)
		}
	}
}

// ShouldSkipMedicationReminder checks whether all doses for the reminder bucket are already taken.
func ShouldSkipMedicationReminder(
	ctx context.Context,
	prescriptionRepo repository.PrescriptionRepository,
	intakeRepo repository.MedicationIntakeRepository,
	reminder *domain.Reminder,
	scheduledFor time.Time,
) (bool, error) {
	if reminder == nil || reminder.Kind != domain.KindMedication || reminder.PrescriptionID == nil {
		return false, nil
	}

	timeOfDay, ok := domain.ReminderTimeOfDay(reminder)
	if !ok {
		return false, nil
	}

	prescription, err := prescriptionRepo.FindByID(ctx, *reminder.PrescriptionID)
	if err != nil {
		return false, err
	}
	if prescription == nil {
		return false, nil
	}

	scheduledDate, err := startOfDayInTimezone(scheduledFor, prescription.Timezone)
	if err != nil {
		return false, err
	}

	return allDosesTakenForTimeOfDay(ctx, intakeRepo, prescription, timeOfDay, scheduledDate)
}

func allDosesTakenForTimeOfDay(
	ctx context.Context,
	intakeRepo repository.MedicationIntakeRepository,
	prescription *domain.Prescription,
	timeOfDay domain.TimeOfDay,
	scheduledDate time.Time,
) (bool, error) {
	hasDose := false
	for _, med := range prescription.Medications {
		for _, dose := range med.Schedule {
			if dose.TimeOfDay != timeOfDay {
				continue
			}
			hasDose = true
			intake, err := intakeRepo.FindBySlot(ctx, prescription.PatientID, prescription.ID, med.DrugName, dose, scheduledDate)
			if err != nil {
				return false, err
			}
			if intake == nil {
				return false, nil
			}
		}
	}
	return hasDose, nil
}
