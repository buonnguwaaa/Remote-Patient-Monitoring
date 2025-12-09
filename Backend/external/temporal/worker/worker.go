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
	acts := activity.NewProcessingAlertActivity(container.MeasurementRepo, container.ThresholdRepo, container.AlertRepo)

	w.RegisterActivity(acts.EvaluateAndSendAlertActivity)
	w.RegisterWorkflow(workflow.AlertWorkflow)

	log.Println("Temporal worker started...")
	return w.Run(worker.InterruptCh())
}
