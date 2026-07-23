package workflow

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

const AppointmentUpdateSignal = "APPOINTMENT-UPDATE-SIGNAL"

type appointmentReminderStep struct {
	leadTime time.Duration
	kind     dto.AppointmentReminderKind
}

var appointmentReminderSteps = []appointmentReminderStep{
	{leadTime: 24 * time.Hour, kind: dto.AppointmentReminderKind1d},
	{leadTime: 2 * time.Hour, kind: dto.AppointmentReminderKind2h},
}

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

	stepIndex := 0
	for stepIndex < len(appointmentReminderSteps) {
		step := appointmentReminderSteps[stepIndex]

		var appointment domain.FollowUpAppointment
		if err := workflow.ExecuteActivity(ctx, "GetAppointmentActivity", input.AppointmentID).Get(ctx, &appointment); err != nil {
			return err
		}

		if appointment.Status != domain.FollowUpAppointmentStatusScheduled {
			logger.Info("Appointment reminder stopped", "id", appointment.ID.Hex(), "status", appointment.Status)
			return nil
		}

		now := workflow.Now(ctx)
		if !appointment.ScheduledAt.After(now) {
			return nil
		}

		remindAt := appointment.ScheduledAt.Add(-step.leadTime)

		if !remindAt.After(now) {
			if err := sendAppointmentReminder(ctx, input.AppointmentID, step.kind); err != nil {
				return err
			}
			stepIndex++
			continue
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
			// Appointment was updated — recompute both lead times from scratch.
			stepIndex = 0
			continue
		}

		if err := sendAppointmentReminder(ctx, input.AppointmentID, step.kind); err != nil {
			return err
		}
		stepIndex++
	}

	return nil
}

func sendAppointmentReminder(ctx workflow.Context, appointmentID string, kind dto.AppointmentReminderKind) error {
	return workflow.ExecuteActivity(ctx, "SendAppointmentReminderActivity", dto.SendAppointmentReminderInput{
		AppointmentID: appointmentID,
		Kind:          kind,
	}).Get(ctx, nil)
}
