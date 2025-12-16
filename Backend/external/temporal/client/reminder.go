package client

import (
	"context"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/workflow"
	"go.temporal.io/sdk/client"
)

const ReminderTaskQueue = "REMINDER-TASK-QUEUE"

func StartReminderWorkflow(input workflow.ReminderWorkflowInput) error {
	c, err := New()
	if err != nil {
		return err
	}
	defer c.Close()

	_, err = c.ExecuteWorkflow(
		context.Background(),
		client.StartWorkflowOptions{
			ID:        "reminder-" + input.ReminderID,
			TaskQueue: ReminderTaskQueue,
		},
		workflow.ReminderWorkflow,
		input,
	)
	return err
}
