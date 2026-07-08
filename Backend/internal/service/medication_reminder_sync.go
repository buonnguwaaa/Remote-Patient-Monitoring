package service

import (
	"context"
	"log"
	"strings"
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

// SnoozeRemindersAfterIntake skips the single upcoming reminder occurrence whose
// doses (all doses scheduled at the taken dose's clock) are already taken before
// the reminder is due.
func (s *MedicationReminderSync) SnoozeRemindersAfterIntake(
	ctx context.Context,
	prescription *domain.Prescription,
	dose domain.MedicationDose,
	scheduledDate time.Time,
	takenAt time.Time,
) {
	if prescription == nil || s.reminderRepo == nil || s.intakeRepo == nil {
		return
	}

	hour, minute := domain.DoseClock(dose)

	allTaken, err := allDosesTakenForClock(ctx, s.intakeRepo, prescription, hour, minute, scheduledDate)
	if err != nil || !allTaken {
		return
	}

	slotTime, err := domain.ReminderSlotTime(scheduledDate, prescription.Timezone, hour, minute)
	if err != nil {
		log.Printf("[WARN] failed to resolve reminder slot time: %v", err)
		return
	}
	// Only snooze a future occurrence (dose taken before the reminder is due).
	if !takenAt.Before(slotTime) {
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

	occurrence := slotTime.UTC().Format(time.RFC3339)
	for _, reminder := range reminders {
		if err := temporalclient.SignalReminderSkipOccurrence(ctx, reminder.ID.Hex(), occurrence); err != nil {
			log.Printf("[WARN] failed to snooze reminder %s: %v", reminder.ID.Hex(), err)
		}
	}
}

// MedicationOccurrence describes a single medication reminder fire.
type MedicationOccurrence struct {
	Skip    bool
	Message string
}

// ResolveMedicationOccurrence resolves, for a medication reminder firing at
// scheduledFor, the doses due at that clock. It reports whether the fire should
// be skipped (all matching doses already taken) and builds the notification
// message for the doses due at that time.
func ResolveMedicationOccurrence(
	ctx context.Context,
	prescriptionRepo repository.PrescriptionRepository,
	intakeRepo repository.MedicationIntakeRepository,
	reminder *domain.Reminder,
	scheduledFor time.Time,
) (MedicationOccurrence, error) {
	if reminder == nil || reminder.Kind != domain.KindMedication || reminder.PrescriptionID == nil {
		return MedicationOccurrence{}, nil
	}

	prescription, err := prescriptionRepo.FindByID(ctx, *reminder.PrescriptionID)
	if err != nil {
		return MedicationOccurrence{}, err
	}
	if prescription == nil {
		return MedicationOccurrence{}, nil
	}

	loc, err := time.LoadLocation(prescription.Timezone)
	if err != nil {
		return MedicationOccurrence{}, err
	}
	local := scheduledFor.In(loc)
	hour, minute := local.Hour(), local.Minute()

	scheduledDate, err := startOfDayInTimezone(scheduledFor, prescription.Timezone)
	if err != nil {
		return MedicationOccurrence{}, err
	}

	messages := make([]string, 0)
	hasDose := false
	allTaken := true
	for _, med := range prescription.Medications {
		for _, dose := range med.Schedule {
			dh, dm := domain.DoseClock(dose)
			if dh != hour || dm != minute {
				continue
			}
			hasDose = true
			messages = append(messages, formatDoseReminderMessage(med, dose))

			intake, err := intakeRepo.FindBySlot(ctx, prescription.PatientID, prescription.ID, med.DrugName, dose, scheduledDate)
			if err != nil {
				return MedicationOccurrence{}, err
			}
			if intake == nil {
				allTaken = false
			}
		}
	}

	if !hasDose {
		return MedicationOccurrence{}, nil
	}

	return MedicationOccurrence{
		Skip:    allTaken,
		Message: strings.Join(messages, "; "),
	}, nil
}

// allDosesTakenForClock reports whether every dose scheduled at the given clock
// has a recorded intake for the scheduled date.
func allDosesTakenForClock(
	ctx context.Context,
	intakeRepo repository.MedicationIntakeRepository,
	prescription *domain.Prescription,
	hour, minute int,
	scheduledDate time.Time,
) (bool, error) {
	hasDose := false
	for _, med := range prescription.Medications {
		for _, dose := range med.Schedule {
			dh, dm := domain.DoseClock(dose)
			if dh != hour || dm != minute {
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
