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
	// skipTimes holds specific occurrences (RFC3339 UTC) to skip. A reminder can
	// fire at several times per day, so skips must target a specific occurrence.
	skipTimes := make(map[string]bool)
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

		// Drop skip entries that are already in the past.
		for key := range skipTimes {
			if t, err := time.Parse(time.RFC3339, key); err == nil && !t.After(now) {
				delete(skipTimes, key)
			}
		}

		// Find the next occurrence that has not been marked for skipping.
		searchFrom := now
		var nextTime time.Time
		var ok bool
		for {
			nextTime, ok = reminder_helper.CalculateNextReminderTime(searchFrom, &reminder)
			if !ok {
				break
			}
			if skipTimes[nextTime.UTC().Format(time.RFC3339)] {
				searchFrom = nextTime.Add(time.Minute)
				continue
			}
			break
		}
		if !ok {
			_ = workflow.ExecuteActivity(ctx, "UpdateReminderStatusActivity", reminder.ID.Hex(), domain.ReminderStatusExpired).Get(ctx, nil)
			logger.Info("Reminder expired", "id", reminder.ID.Hex())
			return nil
		}

		timer := workflow.NewTimer(ctx, nextTime.Sub(now))
		timerFired := false
		selector := workflow.NewSelector(ctx)
		selector.AddReceive(signalCh, func(c workflow.ReceiveChannel, more bool) {
			c.Receive(ctx, nil)
		})
		selector.AddReceive(skipCh, func(c workflow.ReceiveChannel, more bool) {
			var occurrence string
			c.Receive(ctx, &occurrence)
			if occurrence != "" {
				skipTimes[occurrence] = true
			}
		})
		selector.AddFuture(timer, func(f workflow.Future) {
			timerFired = true
		})
		selector.Select(ctx)

		if err := workflow.ExecuteActivity(ctx, "GetReminderActivity", input.ReminderID).Get(ctx, &reminder); err != nil {
			return err
		}
		if !timerFired {
			// A signal arrived (status change or skip); recompute.
			continue
		}
		if reminder.Status != domain.ReminderStatusActive {
			continue
		}

		scheduledFor := nextTime.UTC().Format(time.RFC3339)
		var skipped bool
		if err := workflow.ExecuteActivity(ctx, "SendReminderActivity", reminder.ID.Hex(), scheduledFor).Get(ctx, &skipped); err != nil {
			return err
		}
		// Whether sent or skipped at fire time, the loop advances past this
		// occurrence because the next search starts at (or after) now.
	}
}
