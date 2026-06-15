package workflow

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/reminder_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

const ReminderStatusSignal = "REMINDER-STATUS-SIGNAL"
const ReminderSkipSignal = "REMINDER-SKIP-SIGNAL"

func ReminderWorkflow(ctx workflow.Context, input dto.ReminderWorkflowInput) error {
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
	skipCh := workflow.GetSignalChannel(ctx, ReminderSkipSignal)

	var reminder domain.Reminder
	var skipAfter time.Time
	if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
		return err
	}

	for {
		if reminder.Status == domain.ReminderStatusCanceled || reminder.Status == domain.ReminderStatusExpired {
			logger.Info("Reminder stopped", "id", reminder.ID.Hex(), "status", reminder.Status)
			return nil
		}

		now := workflow.Now(ctx)

		if reminder.Status == domain.ReminderStatusPaused {
			if now.After(reminder.EndDate) {
				_ = workflow.ExecuteActivity(ctx, "UpdateReminderStatusActivity", reminder.ID.Hex(), domain.ReminderStatusExpired).Get(ctx, nil)
				logger.Info("Reminder expired while paused", "id", reminder.ID.Hex())
				return nil
			}

			timer := workflow.NewTimer(ctx, reminder.EndDate.Sub(now))
			selector := workflow.NewSelector(ctx)
			selector.AddReceive(signalCh, func(c workflow.ReceiveChannel, more bool) { c.Receive(ctx, nil) })
			selector.AddFuture(timer, func(f workflow.Future) {})
			selector.Select(ctx)

			if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
				return err
			}
			continue
		}

		now = workflow.Now(ctx)
		searchFrom := now
		if skipAfter.After(now) {
			searchFrom = skipAfter
		}

		nextTime, ok := reminder_helper.CalculateNextReminderTime(searchFrom, &reminder)
		if !ok {
			_ = workflow.ExecuteActivity(ctx, "UpdateReminderStatusActivity", reminder.ID.Hex(), domain.ReminderStatusExpired).Get(ctx, nil)
			logger.Info("Reminder expired", "id", reminder.ID.Hex())
			return nil
		}

		timer := workflow.NewTimer(ctx, nextTime.Sub(now))
		timerFired := false
		skipOccurrence := false
		selector := workflow.NewSelector(ctx)
		selector.AddReceive(signalCh, func(c workflow.ReceiveChannel, more bool) {
			c.Receive(ctx, nil)
			timerFired = false
		})
		selector.AddReceive(skipCh, func(c workflow.ReceiveChannel, more bool) {
			c.Receive(ctx, nil)
			timerFired = false
			skipOccurrence = true
		})
		selector.AddFuture(timer, func(f workflow.Future) {
			timerFired = true
		})
		selector.Select(ctx)

		if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
			return err
		}
		if skipOccurrence {
			skipAfter = nextTime.Add(time.Minute)
			continue
		}
		if !timerFired {
			continue
		}
		if reminder.Status != domain.ReminderStatusActive {
			continue
		}

		skipAfter = time.Time{}
		scheduledFor := nextTime.UTC().Format(time.RFC3339)
		var skipped bool
		if err := workflow.ExecuteActivity(ctx, "SendReminderActivity", reminder.ID.Hex(), scheduledFor).Get(ctx, &skipped); err != nil {
			return err
		}
		if skipped {
			skipAfter = nextTime.Add(time.Minute)
		}
	}
}
