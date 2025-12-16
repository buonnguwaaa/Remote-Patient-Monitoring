package workflow

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/reminder_helper"
)

type ReminderWorkflowInput struct {
	ReminderID string
}

func ReminderWorkflow(ctx workflow.Context, input ReminderWorkflowInput) error {
	logger := workflow.GetLogger(ctx)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: time.Second * 10,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval: time.Second,
			MaximumAttempts: 5,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	for {
		// 1️⃣ Load reminder
		var reminder *domain.Reminder
		if err := workflow.ExecuteActivity(
			ctx,
			"GetReminder",
			input.ReminderID,
		).Get(ctx, reminder); err != nil {
			return err
		}

		// 2️⃣ Check status
		if reminder.Status == "canceled" || reminder.Status == "expired" {
			logger.Info("Reminder ended", "id", input.ReminderID)
			return nil
		}

		// 3️⃣ Calculate next time
		now := workflow.Now(ctx)
		next, ok := reminder_helper.CalculateNextReminderTime(now, reminder)
		if !ok {
			logger.Info("No next reminder time", "id", input.ReminderID)
			return nil
		}

		// 4️⃣ Sleep until next reminder
		workflow.Sleep(ctx, next.Sub(now))

		// 5️⃣ Re-check status after wake up
		if err := workflow.ExecuteActivity(
			ctx,
			"SendReminder",
			input.ReminderID,
		).Get(ctx, nil); err != nil {
			return err
		}
	}
}
