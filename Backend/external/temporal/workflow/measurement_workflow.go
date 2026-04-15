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

	var alertID string
	if err := workflow.ExecuteActivity(ctx, "EvaluateAndCreateAlertActivity", input.MeasurementID, input.PatientID).Get(ctx, &alertID); err != nil {
		return "", err
	}

	if alertID == "" || alertID == "no-violation" || alertID == "no-threshold" {
		return alertID, nil
	}

	if err := workflow.ExecuteActivity(ctx, "SendAlertPushActivity", alertID).Get(ctx, nil); err != nil {
		return "", err
	}

	return alertID, nil
}
