package client

import (
	"context"
	"fmt"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/workflow"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"go.temporal.io/sdk/client"
)

const AlertTaskQueue = "ALERT-TASK-QUEUE"


func StartAlertWorkflowAsync(input dto.MeasurementAlertInput) error {
	c, err := New()
	if err != nil {
		return err
	}
	defer c.Close()

	workflowOptions := client.StartWorkflowOptions{
		ID:        "measurement_alert-" + input.MeasurementID,
		TaskQueue: AlertTaskQueue,
	}

	_, err = c.ExecuteWorkflow(
		context.Background(),
		workflowOptions,
		workflow.AlertWorkflow,
		input,
	)
	if err != nil {
		return err
	}

	// không gọi Get() => không chờ kết quả
	fmt.Println("Started alert workflow for measurement:", input.MeasurementID)
	return nil
}

// Optional: nếu muốn start và chờ (testing)
func StartAlertWorkflowAndWait(input dto.MeasurementAlertInput) (string, error) {
	c, err := New()
	if err != nil {
		return "", err
	}
	defer c.Close()

	workflowOptions := client.StartWorkflowOptions{
		ID:        "measurement_alert-" + input.MeasurementID,
		TaskQueue: "ALERT-TASK-QUEUE",
	}

	wr, err := c.ExecuteWorkflow(context.Background(), workflowOptions, workflow.AlertWorkflow, input)
	if err != nil {
		return "", err
	}

	var result string
	if err := wr.Get(context.Background(), &result); err != nil {
		return "", err
	}
	return result, nil
}
