package worker

import (
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/fcm"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/activity"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/workflow"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"go.temporal.io/sdk/worker"
)

func Start() error {
	c, err := client.New()
	if err != nil {
		return err
	}
	defer c.Close()

	if err := config.ConnectMongo(); err != nil {
		return err
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[WARN] disconnect mongo failed: %v", err)
		}
	}()

	var pushClient *fcm.Client
	pushClient, err = fcm.NewClientFromEnv()
	if err != nil {
		log.Printf("[WARN] FCM client not configured, push delivery disabled: %v", err)
		pushClient = nil
	}

	container := container.NewTemporalWorkerContainer(pushClient)
	alertActs := activity.NewProcessingAlertActivity(
		container.MeasurementRepo,
		container.ThresholdRepo,
		container.AlertRepo,
		container.NotificationService,
	)
	reminderActs := activity.NewReminderActivity(container.ReminderRepo, container.NotificationService)

	alertWorker := worker.New(c, client.AlertTaskQueue, worker.Options{})
	reminderWorker := worker.New(c, client.ReminderTaskQueue, worker.Options{})

	alertWorker.RegisterActivity(alertActs.EvaluateAndCreateAlertActivity)
	alertWorker.RegisterActivity(alertActs.SendAlertPushActivity)
	reminderWorker.RegisterActivity(reminderActs.GetReminderActivity)
	reminderWorker.RegisterActivity(reminderActs.SendReminderActivity)
	reminderWorker.RegisterActivity(reminderActs.UpdateReminderStatusActivity)

	alertWorker.RegisterWorkflow(workflow.AlertWorkflow)
	reminderWorker.RegisterWorkflow(workflow.ReminderWorkflow)

	log.Println("Temporal workers started...")

	errCh := make(chan error, 2)
	go func() { errCh <- alertWorker.Run(worker.InterruptCh()) }()
	go func() { errCh <- reminderWorker.Run(worker.InterruptCh()) }()
	return <-errCh
}
