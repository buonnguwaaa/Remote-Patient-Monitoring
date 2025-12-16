package activity

import (
	"context"
	"fmt"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

type ReminderActivity struct {
	reminderRepo repository.ReminderRepository
}

func NewReminderActivity(repo repository.ReminderRepository) *ReminderActivity {
	return &ReminderActivity{reminderRepo: repo}
}

func (a *ReminderActivity) GetReminder(
	ctx context.Context,
	reminderID string,
) (*domain.Reminder, error) {

	id, err := util.MustHexToObjectID(reminderID)
	if err != nil {
		return nil, err
	}

	return a.reminderRepo.FindByID(ctx, id)
}

func (a *ReminderActivity) SendReminder(
	ctx context.Context,
	reminderID string,
) error {

	id, err := util.MustHexToObjectID(reminderID)
	if err != nil {
		return err
	}

	reminder, err := a.reminderRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	fmt.Printf(
		"[REMINDER] patient=%s kind=%s message=%s at=%s\n",
		reminder.PatientID.Hex(),
		reminder.Kind,
		reminder.Message,
		time.Now().UTC(),
	)

	return nil
}
