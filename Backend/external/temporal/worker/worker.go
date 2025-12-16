package worker

import (
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
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

	w := worker.New(c, client.AlertTaskQueue, worker.Options{})

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[GIN-fatal] Could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[GIN-error] Error disconnecting from MongoDB: %v", err)
		}
	}()

	container := container.NewTemporalWorkerContainer()
	alertActs := activity.NewProcessingAlertActivity(container.MeasurementRepo, container.ThresholdRepo, container.AlertRepo)
	reminderActs := activity.NewReminderActivity(container.ReminderRepo)
	
	w.RegisterActivity(alertActs.EvaluateAndSendAlertActivity)
	w.RegisterActivity(reminderActs.GetReminder)
	w.RegisterActivity(reminderActs.SendReminder)
	w.RegisterWorkflow(workflow.AlertWorkflow)
	w.RegisterWorkflow(workflow.ReminderWorkflow)

	log.Println("Temporal worker started...")
	return w.Run(worker.InterruptCh())
}
