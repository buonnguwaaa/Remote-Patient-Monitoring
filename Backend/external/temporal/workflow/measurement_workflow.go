package workflow

import (
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/dto"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

func AlertWorkflow(ctx workflow.Context, input dto.MeasurementAlertInput) (string, error) {
	ao := workflow.ActivityOptions{
		StartToCloseTimeout: time.Second * 10,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumAttempts:    5,
		},
	}

	ctx = workflow.WithActivityOptions(ctx, ao)

	var createResult dto.EvaluateAndCreateAlertResult
	if err := workflow.ExecuteActivity(ctx, "EvaluateAndCreateAlertActivity", input.MeasurementID, input.PatientID).Get(ctx, &createResult); err != nil {
		return "", err
	}
	if !createResult.Created {
		return "no-violation", nil
	}

	if createResult == (dto.EvaluateAndCreateAlertResult{}) || createResult.AlertID == "" {
		return createResult.AlertID, nil
	}

	if err := workflow.ExecuteActivity(ctx, "SendAlertPushActivity", createResult.AlertID).Get(ctx, nil); err != nil {
		return "", err
	}

	var sendResult dto.SendAlertMessageResult
	if err := workflow.ExecuteActivity(ctx, "SendAlertMessageActivity", dto.SendAlertMessageInput{AlertID: createResult.AlertID}).Get(ctx, &sendResult); err != nil {
		return "", err
	}

	var publishResult struct{}
	if err := workflow.ExecuteActivity(ctx, "PublishChatEventActivity", dto.PublishChatEventInput{ConversationID: sendResult.ConversationID, Message: sendResult.Message}).Get(ctx, &publishResult); err != nil {
		return "", err
	}

	var userEventResult struct{}
	if err := workflow.ExecuteActivity(ctx, "PublishUserEventActivity", dto.PublishUserEventInput{
		ConversationID: sendResult.ConversationID,
		Message:        sendResult.Message,
		DoctorID:       sendResult.DoctorID,
		PatientID:      sendResult.PatientID,
		AlertID:        sendResult.AlertID,
		Severity:       sendResult.Severity,
	}).Get(ctx, &userEventResult); err != nil {
		return "", err
	}
	return "created-notification", nil
}
