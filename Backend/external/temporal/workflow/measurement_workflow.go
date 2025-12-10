package workflow

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

type MeasurementAlertInput struct {
	MeasurementID string
	PatientID     string
}

func AlertWorkflow(ctx workflow.Context, input MeasurementAlertInput) (string, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: time.Second * 10,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumAttempts:    5,
		},
	}

	ctx = workflow.WithActivityOptions(ctx, ao)

	var res string
	err := workflow.ExecuteActivity(ctx, "EvaluateAndSendAlertActivity", input.MeasurementID, input.PatientID).Get(ctx, &res)
	if err != nil {
		return "", err
	}
	return res, nil
}
