package seed

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (s *Seeder) seedAssignments(ctx context.Context, data *seedData) error {
	created := 0
	now := time.Now().UTC()

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		if _, err := s.assignmentRepo.FindByPatientID(ctx, patient.ID); err == nil {
			continue
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			return err
		}

		assignment := &domain.Assignment{
			ID:         primitive.NewObjectID(),
			PatientID:  patient.ID,
			DoctorID:   data.doctors[i%len(data.doctors)].ID,
			NurseID:    data.nurses[i%len(data.nurses)].ID,
			AssignedBy: data.admins[0].ID,
			CreatedAt:  now,
			UpdatedAt:  now,
		}
		if _, err := s.assignmentRepo.Create(ctx, assignment); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] assignments: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedThresholds(ctx context.Context, data *seedData) error {
	created := 0
	glucoseMin := 70.0
	glucoseMax := 140.0
	now := time.Now().UTC()

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		existing, err := s.thresholdRepo.FindWithFilter(ctx, repository.ThresholdFilter{
			PatientID: patient.ID.Hex(),
		})
		if err != nil {
			return err
		}
		if len(existing) > 0 {
			continue
		}

		threshold := &domain.Threshold{
			ID:                 primitive.NewObjectID(),
			PatientID:          patient.ID,
			DoctorID:           data.doctors[i%len(data.doctors)].ID,
			TemperatureMin:     36.0,
			TemperatureMax:     37.5,
			HeartRateMin:       60,
			HeartRateMax:       100,
			RespiratoryRateMin: 12,
			RespiratoryRateMax: 20,
			SpO2Min:            95,
			SysMin:             90,
			SysMax:             140,
			DiaMin:             60,
			DiaMax:             90,
			GlucoseMin:         &glucoseMin,
			GlucoseMax:         &glucoseMax,
			EffectiveFrom:      now.Add(-time.Duration(i) * time.Hour),
		}
		if _, err := s.thresholdRepo.Create(ctx, threshold); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] thresholds: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedMeasurements(ctx context.Context, data *seedData) ([]*domain.Measurement, error) {
	count, err := s.countCollection(ctx, "measurements", bson.M{})
	if err != nil {
		return nil, err
	}

	created := 0
	if count < seedCount {
		device := "home-monitor"
		preMeal := domain.MealTimingPreMeal
		postMeal := domain.MealTimingPostMeal

		for i := int(count); i < seedCount; i++ {
			patient := data.patients[i]
			note := fmt.Sprintf("Seed measurement %02d", i+1)

			var measurement domain.Measurement
			if i%3 == 0 {
				measurement = domain.Measurement{
					PatientID:       patient.ID,
					Temperature:     fp(36.5 + float64(i%5)*0.1),
					HeartRate:       fp(float64(70 + i%20)),
					RespiratoryRate: fp(float64(14 + i%6)),
					SpO2:            fp(float64(96 + i%3)),
					BloodPressure: domain.BloodPressure{
						Systolic:  fp(float64(115 + i%20)),
						Diastolic: fp(float64(75 + i%10)),
						MAP:       fp(float64(90 + i%10)),
					},
					Device: &device,
					Note:   &note,
				}
			} else if i%3 == 1 {
				measurement = domain.Measurement{
					PatientID: patient.ID,
					Glucose: domain.Glucose{
						BloodGlucose: fp(float64(95 + i%40)),
					},
					MealTiming: &preMeal,
					Device:     &device,
				}
			} else {
				measurement = domain.Measurement{
					PatientID: patient.ID,
					Glucose: domain.Glucose{
						BloodGlucose: fp(float64(130 + i%50)),
					},
					MealTiming: &postMeal,
					Device:     &device,
				}
			}

			if _, err := s.measurementRepo.Create(ctx, &measurement); err != nil {
				return nil, err
			}
			created++
		}
	}

	result, err := s.loadMeasurements(ctx, seedCount)
	if err != nil {
		return nil, err
	}

	log.Printf("[seed] measurements: %d total (%d created)", len(result), created)
	return result, nil
}

func (s *Seeder) loadMeasurements(ctx context.Context, limit int) ([]*domain.Measurement, error) {
	cursor, err := s.db.Collection("measurements").Find(
		ctx,
		bson.M{},
		options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "createdAt", Value: 1}}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make([]*domain.Measurement, 0, limit)
	for cursor.Next(ctx) {
		var m domain.Measurement
		if err := cursor.Decode(&m); err != nil {
			return nil, err
		}
		result = append(result, &m)
	}
	return result, cursor.Err()
}

func (s *Seeder) seedPrescriptions(ctx context.Context, data *seedData) ([]*domain.Prescription, error) {
	result := make([]*domain.Prescription, 0, seedCount)
	now := time.Now().UTC()

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		existing, err := s.prescriptionRepo.FindWithFilter(ctx, repository.PrescriptionFilter{
			PatientID: patient.ID.Hex(),
		})
		if err != nil {
			return nil, err
		}
		if len(existing) > 0 {
			prescription := existing[0]
			result = append(result, &prescription)
			continue
		}

		startDate := now.Add(-time.Duration(i) * 24 * time.Hour)
		profile := buildPrescriptionProfile(i, startDate)
		profile.Status = domain.PrescriptionStatusActive

		prescription := &domain.Prescription{
			ID:           primitive.NewObjectID(),
			PatientID:    patient.ID,
			PrescribedBy: data.doctors[i%len(data.doctors)].ID,
			Medications:  profile.Medications,
			Timezone:     seedTimezone,
			DaysOfWeek:   profile.DaysOfWeek,
			StartDate:    startDate,
			EndDate:      profile.EndDate,
			Status:       profile.Status,
		}

		createdPrescription, err := s.prescriptionRepo.Create(ctx, prescription)
		if err != nil {
			return nil, err
		}
		result = append(result, createdPrescription)
	}

	log.Printf("[seed] prescriptions: %d total (%d created)", len(result), len(result))
	return result, nil
}

func (s *Seeder) seedAlerts(ctx context.Context, data *seedData) error {
	if len(data.measurements) < seedCount {
		return fmt.Errorf("need at least %d measurements, got %d", seedCount, len(data.measurements))
	}

	created := 0
	severities := []domain.Severity{domain.SeverityLow, domain.SeverityMedium, domain.SeverityHigh}

	for i := 0; i < seedCount; i++ {
		measurement := data.measurements[i]
		existing, err := s.alertRepo.FindByMeasurementID(ctx, measurement.ID)
		if err != nil {
			return err
		}
		if existing != nil {
			continue
		}

		severity := pick(severities, i)
		alert := &domain.Alert{
			ID:            primitive.NewObjectID(),
			PatientID:     measurement.PatientID,
			MeasurementID: measurement.ID,
			Violations: []domain.ThresholdViolation{
				{
					Type:      "heartRate",
					Rule:      "heartRate_max",
					Observed:  110 + float64(i%10),
					Threshold: 100,
					Severity:  severity,
				},
			},
			Status:   domain.StatusOpen,
			Severity: severity,
		}

		if _, err := s.alertRepo.Create(ctx, alert); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] alerts: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedReminders(ctx context.Context, data *seedData) error {
	count, err := s.countCollection(ctx, "reminders", bson.M{})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] reminders: %d total (0 created)", count)
		return nil
	}

	created := 0
	now := time.Now().UTC()
	kindMeasure := domain.KindMeasure
	kindMedication := domain.KindMedication
	timeMorning := domain.TimeOfDayMorning

	for i := int(count); i < seedCount; i++ {
		patient := data.patients[i]
		prescription := data.prescriptions[i]
		kind := kindMeasure
		message := fmt.Sprintf("Take vitals for patient %02d", i+1)
		if i%2 == 1 {
			kind = kindMedication
			message = fmt.Sprintf("Take medication for patient %02d", i+1)
		}

		reminder := &domain.Reminder{
			ID:         primitive.NewObjectID(),
			PatientID:  patient.ID,
			Kind:       kind,
			Message:    message,
			Times:      []domain.ReminderTime{{Hour: 8 + (i % 10), Minute: (i * 5) % 60}},
			DaysOfWeek: []int{1, 2, 3, 4, 5, 6, 7},
			Timezone:   seedTimezone,
			Status:     domain.ReminderStatusActive,
			StartDate:  now,
			EndDate:    now.AddDate(0, 3, 0),
			CreatedBy:  data.doctors[i%len(data.doctors)].ID,
		}
		if kind == kindMedication {
			reminder.PrescriptionID = &prescription.ID
			reminder.TimeOfDay = &timeMorning
			meal := domain.MealTimingPostMeal
			reminder.MealTiming = &meal
		}

		if _, err := s.reminderRepo.Create(ctx, reminder); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] reminders: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedMedicationIntakes(ctx context.Context, data *seedData) error {
	count, err := s.countCollection(ctx, "medication_intakes", bson.M{})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] medication intakes: %d total (0 created)", count)
		return nil
	}

	created := 0
	for i := int(count); i < seedCount; i++ {
		patient := data.patients[i]
		prescription := data.prescriptions[i]
		medication, dose := pickPrescriptionDose(prescription, i)
		scheduled := daysAgo(i)

		intake := &domain.MedicationIntake{
			ID:             primitive.NewObjectID(),
			PatientID:      patient.ID,
			PrescriptionID: prescription.ID,
			DrugName:       medication.DrugName,
			Dosage:         medication.Dosage,
			Dose:           dose,
			ScheduledDate:  scheduled,
			TakenAt:        scheduled.Add(15 * time.Minute),
		}

		if _, err := s.medicationIntakeRepo.Create(ctx, intake); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] medication intakes: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedFollowUpAppointments(ctx context.Context, data *seedData) error {
	count, err := s.countCollection(ctx, "follow_up_appointments", bson.M{})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] follow-up appointments: %d total (0 created)", count)
		return nil
	}

	created := 0
	statuses := []domain.FollowUpAppointmentStatus{
		domain.FollowUpAppointmentStatusScheduled,
		domain.FollowUpAppointmentStatusCompleted,
		domain.FollowUpAppointmentStatusCanceled,
	}

	for i := int(count); i < seedCount; i++ {
		doctor := data.doctors[i%len(data.doctors)]
		appointment := &domain.FollowUpAppointment{
			ID:              primitive.NewObjectID(),
			PatientID:       data.patients[i].ID,
			DoctorID:        doctor.ID,
			ScheduledAt:     daysAhead(i),
			DurationMinutes: pick([]int{15, 30, 45, 60}, i),
			Timezone:        seedTimezone,
			Location:        "City General Hospital - Room " + fmt.Sprintf("%d", 100+i),
			Notes:           fmt.Sprintf("Follow-up visit %02d", i+1),
			Status:          pick(statuses, i),
			CreatedBy:       doctor.ID,
		}

		if _, err := s.followUpAppointmentRepo.Create(ctx, appointment); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] follow-up appointments: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedConversations(ctx context.Context, data *seedData) ([]*chatDomain.Conversation, error) {
	count, err := s.countCollection(ctx, "conversations", bson.M{})
	if err != nil {
		return nil, err
	}

	created := 0
	if count < seedCount {
		for i := int(count); i < seedCount; i++ {
			doctor := data.doctors[i%len(data.doctors)]
			patient := data.patients[i]
			conversation := &chatDomain.Conversation{
				ID: primitive.NewObjectID(),
				Participants: []chatDomain.Participant{
					{UserID: doctor.ID},
					{UserID: patient.ID},
				},
			}

			if _, err := s.conversationRepo.Create(ctx, conversation); err != nil {
				return nil, err
			}
			created++
		}
	}

	result, err := s.loadConversations(ctx, seedCount)
	if err != nil {
		return nil, err
	}

	log.Printf("[seed] conversations: %d total (%d created)", len(result), created)
	return result, nil
}

func (s *Seeder) loadConversations(ctx context.Context, limit int) ([]*chatDomain.Conversation, error) {
	cursor, err := s.db.Collection("conversations").Find(
		ctx,
		bson.M{},
		options.Find().SetLimit(int64(limit)).SetSort(bson.D{{Key: "createdAt", Value: 1}}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make([]*chatDomain.Conversation, 0, limit)
	for cursor.Next(ctx) {
		var c chatDomain.Conversation
		if err := cursor.Decode(&c); err != nil {
			return nil, err
		}
		result = append(result, &c)
	}
	return result, cursor.Err()
}

func (s *Seeder) seedMessages(ctx context.Context, data *seedData) error {
	if len(data.conversations) < seedCount {
		return fmt.Errorf("need at least %d conversations, got %d", seedCount, len(data.conversations))
	}

	count, err := s.countCollection(ctx, "messages", bson.M{})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] messages: %d total (0 created)", count)
		return nil
	}

	created := 0
	for i := int(count); i < seedCount; i++ {
		conversation := data.conversations[i]
		doctor := data.doctors[i%len(data.doctors)]
		senderID := doctor.ID

		message := &chatDomain.Message{
			ID:             primitive.NewObjectID(),
			ConversationID: conversation.ID,
			MessageSource:  chatDomain.UserMessage,
			SenderID:       &senderID,
			Content:        fmt.Sprintf("Seed message %02d: please monitor your vitals today.", i+1),
		}

		createdMessage, err := s.messageRepo.Create(ctx, message)
		if err != nil {
			return err
		}
		created++

		latestID := createdMessage.ID
		if err := s.conversationRepo.SetLatestMessage(ctx, conversation.ID, latestID); err != nil {
			return err
		}
	}

	log.Printf("[seed] messages: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedVideoSessions(ctx context.Context, data *seedData) error {
	if len(data.conversations) < seedCount {
		return fmt.Errorf("need at least %d conversations, got %d", seedCount, len(data.conversations))
	}

	count, err := s.countCollection(ctx, "video_sessions", bson.M{})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] video sessions: %d total (0 created)", count)
		return nil
	}

	created := 0
	statuses := []domain.VideoSessionStatus{
		domain.VideoSessionPending,
		domain.VideoSessionActive,
		domain.VideoSessionEnded,
	}

	for i := int(count); i < seedCount; i++ {
		doctor := data.doctors[i%len(data.doctors)]
		patient := data.patients[i]
		conversation := data.conversations[i]

		session := &domain.VideoSession{
			ID:             primitive.NewObjectID(),
			ConversationID: conversation.ID,
			DoctorID:       doctor.ID,
			PatientID:      patient.ID,
			CreatedBy:      doctor.ID,
			Provider:       "jitsi",
			RoomName:       fmt.Sprintf("rpm_%s_seed%02d", conversation.ID.Hex()[:8], i+1),
			Status:         pick(statuses, i),
			ExpiresAt:      daysAhead(i + 1),
		}

		if _, err := s.videoSessionRepo.Create(ctx, session); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] video sessions: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedActivityLogs(ctx context.Context, data *seedData) error {
	count, err := s.countCollection(ctx, "activity_logs", bson.M{})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] activity logs: %d total (0 created)", count)
		return nil
	}

	created := 0
	types := []domain.ActivityType{
		domain.ActivityTypeLogin,
		domain.ActivityTypeCreate,
		domain.ActivityTypeUpdate,
		domain.ActivityTypeDelete,
	}

	for i := int(count); i < seedCount; i++ {
		admin := data.admins[i%len(data.admins)]
		entry := domain.NewActivityLog(
			admin.ID,
			admin.Name,
			string(userDomain.RoleAdmin),
			pick(types, i),
			fmt.Sprintf("Seed activity %02d", i+1),
		)
		entry.Resource = pick([]string{"patient", "doctor", "department", "prescription"}, i)
		entry.Method = "POST"
		entry.Path = "/api/v1/seed"
		entry.StatusCode = 200

		if err := s.activityLogRepo.Create(ctx, entry); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] activity logs: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedUserNotifications(ctx context.Context, data *seedData) error {
	created := 0
	types := []domain.NotificationType{
		domain.NotificationTypeAlert,
		domain.NotificationTypeReminder,
		domain.NotificationTypeAppointment,
	}

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		dedupKey := fmt.Sprintf("seed-notification-%02d", i+1)

		notification := &domain.UserNotification{
			UserID:         patient.ID,
			Type:           pick(types, i),
			Title:          fmt.Sprintf("Seed notification %02d", i+1),
			Body:           "This is a seeded in-app notification for development.",
			DedupKey:       dedupKey,
			DeliveryStatus: domain.NotificationDeliverySent,
		}

		if _, createdNew, err := s.notificationRepo.CreateOrGetByDedupKey(ctx, notification); err != nil {
			return err
		} else if createdNew {
			created++
		}
	}

	log.Printf("[seed] user notifications: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedNotificationTokens(ctx context.Context, data *seedData) error {
	created := 0
	platforms := []string{"ios", "android", "web"}

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		token := &domain.NotificationToken{
			UserID:   patient.ID,
			DeviceID: fmt.Sprintf("seed-device-%02d", i+1),
			Platform: pick(platforms, i),
			Provider: "fcm",
			Token:    fmt.Sprintf("seed-fcm-token-%02d", i+1),
			IsActive: true,
		}

		if _, err := s.notificationTokenRepo.UpsertByUserAndDevice(ctx, token); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] notification tokens: %d total (%d upserted)", seedCount, created)
	return nil
}
