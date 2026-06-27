package worker

import (
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/fcm"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/activity"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/client"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/helper/measurement_helper"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/workflow"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"go.temporal.io/sdk/worker"
)

func Start() error {
	c, err := client.New()
	if err != nil {
		return err
	}
	defer c.Close()

	if err := config.ConnectRedis(); err != nil {
		return err
	}
	defer func() {
		if err := config.DisconnectRedis(); err != nil {
			log.Printf("[GIN-error] Error disconnecting from Redis: %v", err)
		}
	}()

	if err := config.ConnectMongo(); err != nil {
		return err
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[WARN] disconnect mongo failed: %v", err)
		}
	}()

	var pushProvider service.PushProvider
	var pushClientRaw *fcm.Client
	pushClientRaw, err = fcm.NewClientFromEnv()
	if err != nil {
		log.Printf("[WARN] FCM client not configured, push delivery disabled: %v", err)
		pushProvider = nil // explicit nil interface, not typed nil pointer
	} else {
		pushProvider = pushClientRaw
	}

	container := container.NewTemporalWorkerContainer(pushProvider)
	publisher := measurement_helper.NewRedisChatEventPublisher(config.Redis.Client)
	userEventPublisher := measurement_helper.NewRedisUserEventPublisher(config.Redis.Client)
	alertActs := activity.NewProcessingAlertActivity(
		container.MeasurementRepo,
		container.ThresholdRepo,
		container.AlertRepo,
		container.AssignmentRepo,
		container.ConversationRepo,
		container.MessageRepo,
		container.NotificationService,
		publisher,
		userEventPublisher,
	)
	reminderActs := activity.NewReminderActivity(
		container.ReminderRepo,
		container.PrescriptionRepo,
		container.MedicationIntakeRepo,
		container.NotificationService,
	)
	appointmentActs := activity.NewAppointmentActivity(
		container.FollowUpAppointmentRepo,
		container.NotificationService,
	)

	alertWorker := worker.New(c, client.AlertTaskQueue, worker.Options{})
	reminderWorker := worker.New(c, client.ReminderTaskQueue, worker.Options{})

	alertWorker.RegisterActivity(alertActs.EvaluateAndCreateAlertActivity)
	alertWorker.RegisterActivity(alertActs.SendAlertPushActivity)
	alertWorker.RegisterActivity(alertActs.SendAlertMessageActivity)
	alertWorker.RegisterActivity(alertActs.PublishChatEventActivity)
	alertWorker.RegisterActivity(alertActs.PublishUserEventActivity)
	reminderWorker.RegisterActivity(reminderActs.GetReminderActivity)
	reminderWorker.RegisterActivity(reminderActs.SendReminderActivity)
	reminderWorker.RegisterActivity(reminderActs.UpdateReminderStatusActivity)
	reminderWorker.RegisterActivity(appointmentActs.GetAppointmentActivity)
	reminderWorker.RegisterActivity(appointmentActs.SendAppointmentReminderActivity)

	alertWorker.RegisterWorkflow(workflow.AlertWorkflow)
	reminderWorker.RegisterWorkflow(workflow.ReminderWorkflow)
	reminderWorker.RegisterWorkflow(workflow.AppointmentReminderWorkflow)

	log.Println("Temporal workers started...")

	errCh := make(chan error, 2)
	go func() { errCh <- alertWorker.Run(worker.InterruptCh()) }()
	go func() { errCh <- reminderWorker.Run(worker.InterruptCh()) }()
	return <-errCh
}
