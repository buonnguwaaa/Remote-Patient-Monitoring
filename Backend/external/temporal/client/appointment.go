package client

import (
	"context"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/workflow"
	"go.temporal.io/sdk/client"
)

func StartAppointmentReminderWorkflow(input dto.AppointmentReminderWorkflowInput) error {
	c, err := New()
	if err != nil {
		return err
	}
	defer c.Close()

	_, err = c.ExecuteWorkflow(
		context.Background(),
		client.StartWorkflowOptions{
			ID:        "appointment-reminder-" + input.AppointmentID,
			TaskQueue: ReminderTaskQueue,
		},
		workflow.AppointmentReminderWorkflow,
		input,
	)
	return err
}

func SignalAppointmentReminderWorkflow(ctx context.Context, appointmentID string) error {
	c, err := New()
	if err != nil {
		return err
	}
	defer c.Close()

	return c.SignalWorkflow(
		ctx,
		"appointment-reminder-"+appointmentID,
		"",
		workflow.AppointmentUpdateSignal,
		nil,
	)
}
