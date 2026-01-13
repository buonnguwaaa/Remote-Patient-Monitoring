package workflow

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/reminder_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

type ReminderWorkflowInput struct {
	ReminderID string
}

const ReminderStatusSignal = "REMINDER-STATUS-SIGNAL"

func ReminderWorkflow(ctx workflow.Context, input ReminderWorkflowInput) error {
	logger := workflow.GetLogger(ctx)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval: time.Second,
			MaximumAttempts: 5,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	signalCh := workflow.GetSignalChannel(ctx, ReminderStatusSignal)

	var reminder domain.Reminder
	if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
		return err
	}

	for {
		// Check stop states
		if reminder.Status == domain.StatusCanceled || reminder.Status == domain.StatusExpired {
			logger.Info("Reminder stopped", "id", reminder.ID.Hex(), "status", reminder.Status)
			return nil
		}

		now := workflow.Now(ctx)

		// Handle paused state
		if reminder.Status == domain.StatusPaused {
			if now.After(reminder.EndDate) {
				_ = workflow.ExecuteActivity(ctx, "UpdateReminderStatusActivity",
					reminder.ID.Hex(), domain.StatusExpired).Get(ctx, nil)
				logger.Info("Reminder expired while paused", "id", reminder.ID.Hex())
				return nil
			}

			timer := workflow.NewTimer(ctx, reminder.EndDate.Sub(now))
			selector := workflow.NewSelector(ctx)
			selector.AddReceive(signalCh, func(c workflow.ReceiveChannel, more bool) {
				c.Receive(ctx, nil)
			})
			selector.AddFuture(timer, func(f workflow.Future) {})
			selector.Select(ctx)
			
			// Reload after wake up
			if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
				return err
			}
			continue
		}

		// Handle active state
		nextTime, ok := reminder_helper.CalculateNextReminderTime(now, &reminder)
		if !ok {
			_ = workflow.ExecuteActivity(ctx, "UpdateReminderStatusActivity",
				reminder.ID.Hex(), domain.StatusExpired).Get(ctx, nil)
			logger.Info("Reminder expired", "id", reminder.ID.Hex())
			return nil
		}

		// Wait until nextTime or signal
		timer := workflow.NewTimer(ctx, nextTime.Sub(now))
		selector := workflow.NewSelector(ctx)
		selector.AddReceive(signalCh, func(c workflow.ReceiveChannel, more bool) {
			c.Receive(ctx, nil)
		})
		selector.AddFuture(timer, func(f workflow.Future) {})
		selector.Select(ctx)

		// Reload after wake up
		if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
			return err
		}

		// If status changed, continue
		if reminder.Status != domain.StatusActive {
			continue
		}

		// Send reminder
		if err := workflow.ExecuteActivity(ctx, "SendReminderActivity", reminder.ID.Hex()).Get(ctx, nil); err != nil {
			return err
		}
	}
}