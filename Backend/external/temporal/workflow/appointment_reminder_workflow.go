package workflow

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

const AppointmentUpdateSignal = "APPOINTMENT-UPDATE-SIGNAL"

const appointmentReminderLeadTime = 24 * time.Hour

func AppointmentReminderWorkflow(ctx workflow.Context, input dto.AppointmentReminderWorkflowInput) error {
	logger := workflow.GetLogger(ctx)

	ao := workflow.ActivityOptions{
		StartToCloseTimeout: 10 * time.Second,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval: time.Second,
			MaximumAttempts: 5,
		},
	}
	ctx = workflow.WithActivityOptions(ctx, ao)

	updateCh := workflow.GetSignalChannel(ctx, AppointmentUpdateSignal)

	for {
		var appointment domain.FollowUpAppointment
		if err := workflow.ExecuteActivity(ctx, "GetAppointmentActivity", input.AppointmentID).Get(ctx, &appointment); err != nil {
			return err
		}

		if appointment.Status != domain.FollowUpAppointmentStatusScheduled {
			logger.Info("Appointment reminder stopped", "id", appointment.ID.Hex(), "status", appointment.Status)
			return nil
		}

		now := workflow.Now(ctx)
		remindAt := appointment.ScheduledAt.Add(-appointmentReminderLeadTime)

		if !remindAt.After(now) {
			if appointment.ScheduledAt.After(now) {
				if err := workflow.ExecuteActivity(ctx, "SendAppointmentReminderActivity", input.AppointmentID).Get(ctx, nil); err != nil {
					return err
				}
			}
			return nil
		}

		timer := workflow.NewTimer(ctx, remindAt.Sub(now))
		timerFired := false
		selector := workflow.NewSelector(ctx)
		selector.AddFuture(timer, func(f workflow.Future) {
			timerFired = true
		})
		selector.AddReceive(updateCh, func(c workflow.ReceiveChannel, more bool) {
			c.Receive(ctx, nil)
			timerFired = false
		})
		selector.Select(ctx)

		if !timerFired {
			continue
		}

		if err := workflow.ExecuteActivity(ctx, "SendAppointmentReminderActivity", input.AppointmentID).Get(ctx, nil); err != nil {
			return err
		}
		return nil
	}
}
