package seed

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
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

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		if _, err := s.assignmentRepo.FindByPatientID(ctx, patient.ID); err == nil {
			continue
		} else if !errors.Is(err, mongo.ErrNoDocuments) {
			return err
		}

		// assignmentRepo.Create doesn't override CreatedAt, so it can be set
		// directly here: shortly after the patient's account was created
		// (accountCreatedAt is 120+ days ago), and comfortably before the
		// threshold/measurements/prescriptions that follow from having a
		// doctor assigned in the first place (all <=114 days ago).
		assignedAt := accountCreatedAt(i).AddDate(0, 0, 1+i%7)

		assignment := &domain.Assignment{
			ID:         primitive.NewObjectID(),
			PatientID:  patient.ID,
			DoctorID:   data.doctors[i%len(data.doctors)].ID,
			NurseID:    data.nurses[i%len(data.nurses)].ID,
			AssignedBy: data.admins[0].ID,
			CreatedAt:  assignedAt,
			UpdatedAt:  assignedAt,
		}
		if _, err := s.assignmentRepo.Create(ctx, assignment); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] assignments: %d total (%d created)", seedCount, created)
	return nil
}

func (s *Seeder) seedThresholds(ctx context.Context, data *seedData) ([]*domain.Threshold, error) {
	result := make([]*domain.Threshold, 0, seedCount)
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
			return nil, err
		}
		if len(existing) > 0 {
			result = append(result, &existing[0])
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
			// Must predate every measurement the history seeder / alert
			// evaluator will evaluate against it (histories span ~18-25 days)
			// but still land after the patient's own account was created
			// (accountCreatedAt: 120+ days ago) - otherwise EvaluateAndCreate
			// AlertActivity would find no threshold effective yet at
			// measurement time and produce no alert at all, a state the real
			// system can't reach.
			EffectiveFrom: now.AddDate(0, 0, -(95 + i%20)),
		}
		createdThreshold, err := s.thresholdRepo.Create(ctx, threshold)
		if err != nil {
			return nil, err
		}
		// thresholdRepo.Create hard-codes CreatedAt to time.Now(); pin it back
		// to the same instant as EffectiveFrom so "when this threshold was set"
		// matches "when it took effect".
		if err := s.backdateCreatedAt(ctx, "thresholds", createdThreshold.ID, threshold.EffectiveFrom); err != nil {
			return nil, err
		}
		createdThreshold.CreatedAt = threshold.EffectiveFrom
		createdThreshold.UpdatedAt = threshold.EffectiveFrom
		result = append(result, createdThreshold)
		created++
	}

	log.Printf("[seed] thresholds: %d total (%d created)", seedCount, created)
	return result, nil
}

// buildSeedMeasurement builds one measurement for patientID using the same
// vitals/glucose anomaly rotation rules as the original seedMeasurements loop.
func buildSeedMeasurement(patientID primitive.ObjectID, i int) domain.Measurement {
	device := "Máy đo tại nhà"
	preMeal := domain.MealTimingPreMeal
	postMeal := domain.MealTimingPostMeal
	note := fmt.Sprintf("Số liệu đo mẫu %02d", i+1)

	switch i % 3 {
	case 0:
		// Baseline vitals sit comfortably inside the seeded threshold
		// (temp 36-37.5, HR 60-100, RR 12-20, SpO2>=95, sys 90-140,
		// dia 60-90); a rotating subset is pushed out of range so
		// seedAlerts (which evaluates against the real threshold) has
		// a realistic mix of low/medium/high alerts instead of none.
		temperature := 36.5 + float64(i%5)*0.1
		heartRate := 70.0 + float64(i%20)
		respiratoryRate := 14.0 + float64(i%6)
		spo2 := 96.0 + float64(i%3)
		systolic := 115.0 + float64(i%20)
		diastolic := 75.0 + float64(i%10)

		switch i % 8 {
		case 0:
			heartRate = 105 + float64(i%15) // tachycardia
		case 3:
			temperature = 38.6 + float64(i%4)*0.4 // fever
		case 5:
			spo2 = 92 - float64(i%5) // hypoxemia
		case 7:
			systolic = 148 + float64(i%15) // hypertension
		}

		systolic = round1(systolic)
		diastolic = round1(diastolic)

		return domain.Measurement{
			PatientID:       patientID,
			Temperature:     fp(round1(temperature)),
			HeartRate:       fp(round1(heartRate)),
			RespiratoryRate: fp(round1(respiratoryRate)),
			SpO2:            fp(round1(spo2)),
			BloodPressure: domain.BloodPressure{
				Systolic:  fp(systolic),
				Diastolic: fp(diastolic),
				MAP:       fp(round1(calculateMAP(systolic, diastolic))),
			},
			Device: &device,
			Note:   &note,
		}
	case 1:
		// Pre-meal glucose baseline stays inside 70-140; a rotating
		// subset simulates hyper/hypoglycemia for alert variety.
		// This branch only ever sees i with i%3==1, so the anomaly
		// switch must key off a modulus whose residues are actually
		// reachable from that subset (i%6 here would always be 1 or
		// 4, making a switch on 0/3 permanently dead) - i%9 cycles
		// through 1, 4, 7 across i%3==1 values instead.
		glucose := 90.0 + float64(i%35)
		switch i % 9 {
		case 1:
			glucose = 145 + float64(i%30) // hyperglycemia
		case 4:
			glucose = 58 + float64(i%10) // hypoglycemia
		}

		return domain.Measurement{
			PatientID: patientID,
			Glucose: domain.Glucose{
				BloodGlucose: fp(round1(glucose)),
			},
			MealTiming: &preMeal,
			Device:     &device,
		}
	default:
		// Post-meal glucose runs naturally higher but is kept under
		// the (meal-agnostic) 140 threshold by default; a rotating
		// subset spikes above it to simulate post-prandial hyperglycemia.
		glucose := 105.0 + float64(i%34)
		if i%5 == 0 {
			glucose = 185 + float64(i%60)
		}

		return domain.Measurement{
			PatientID: patientID,
			Glucose: domain.Glucose{
				BloodGlucose: fp(round1(glucose)),
			},
			MealTiming: &postMeal,
			Device:     &device,
		}
	}
}

func (s *Seeder) seedPrescriptions(ctx context.Context, data *seedData) ([]*domain.Prescription, error) {
	result := make([]*domain.Prescription, 0, seedCount)
	now := time.Now().UTC()
	remindersCreated := 0

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		doctorID := data.doctors[i%len(data.doctors)].ID

		var prescription *domain.Prescription
		existing, err := s.prescriptionRepo.FindWithFilter(ctx, repository.PrescriptionFilter{
			PatientID: patient.ID.Hex(),
		})
		if err != nil {
			return nil, err
		}

		if len(existing) > 0 {
			prescription = &existing[0]
		} else {
			// +3 day buffer so there's always room to fit an EndDate strictly
			// before now (see prescriptionEndDate and ensureMedicationReminder).
			startDate := now.Add(-time.Duration(i+3) * 24 * time.Hour)
			profile := buildPrescriptionProfile(i, startDate)

			createdPrescription, err := s.prescriptionRepo.Create(ctx, &domain.Prescription{
				ID:           primitive.NewObjectID(),
				PatientID:    patient.ID,
				PrescribedBy: doctorID,
				Medications:  profile.Medications,
				Timezone:     seedTimezone,
				DaysOfWeek:   profile.DaysOfWeek,
				StartDate:    startDate,
				EndDate:      profile.EndDate,
				Status:       profile.Status,
			})
			if err != nil {
				return nil, err
			}
			// prescriptionRepo.Create hard-codes CreatedAt to time.Now(); pin
			// it back to StartDate so "when this was prescribed" matches
			// "when the course began" instead of the seed run's wall-clock.
			if err := s.backdateCreatedAt(ctx, "prescriptions", createdPrescription.ID, startDate); err != nil {
				return nil, err
			}
			createdPrescription.CreatedAt = startDate
			createdPrescription.UpdatedAt = startDate
			prescription = createdPrescription
		}
		result = append(result, prescription)

		// Medication reminders are only ever created through the prescription
		// creation path (mirroring prescriptionService.createMedicationReminders),
		// never as standalone reminders - see seedReminders.
		created, err := s.ensureMedicationReminder(ctx, prescription, doctorID)
		if err != nil {
			return nil, err
		}
		if created {
			remindersCreated++
		}
	}

	log.Printf("[seed] prescriptions: %d total (%d created)", len(result), len(result))
	log.Printf("[seed] medication reminders (from prescriptions): %d total (%d created)", len(result), remindersCreated)
	return result, nil
}

// ensureMedicationReminder creates the single "medication" reminder linked to
// a prescription, mirroring prescriptionService.createMedicationReminders: one
// reminder per prescription, firing at every distinct dose clock time. It is
// idempotent so re-running the seed doesn't duplicate reminders.
func (s *Seeder) ensureMedicationReminder(ctx context.Context, prescription *domain.Prescription, prescribedBy primitive.ObjectID) (bool, error) {
	existing, err := s.reminderRepo.FindWithFilter(ctx, repository.ReminderFilter{
		PrescriptionID: prescription.ID.Hex(),
		Kind:           domain.KindMedication,
	})
	if err != nil {
		return false, err
	}
	if len(existing) > 0 {
		return false, nil
	}

	slots := medicationReminderSlots(prescription.Medications)
	if len(slots) == 0 {
		return false, nil
	}

	times := make([]domain.ReminderTime, 0, len(slots))
	messages := make([]string, 0, len(slots))
	for _, slot := range slots {
		times = append(times, domain.ReminderTime{Hour: slot.hour, Minute: slot.minute})
		messages = append(messages, slot.messages...)
	}

	// No Temporal workflow is started for seeded reminders (seeding writes
	// straight to Mongo, bypassing prescriptionService.createMedicationReminders),
	// so - just like seedReminders - the window must already be closed and the
	// status must reflect that. prescriptionEndDate already keeps
	// prescription.EndDate itself in the past, but we still cap defensively
	// here in case that ever changes, since domain.PrescriptionEffectiveEndDate
	// falls back to "start + 1 year" for a nil EndDate.
	now := time.Now().UTC()
	endDate := domain.PrescriptionEffectiveEndDate(prescription.EndDate, prescription.StartDate)
	if cutoff := now.AddDate(0, 0, -2); endDate.After(cutoff) {
		endDate = cutoff
	}
	if !endDate.After(prescription.StartDate) {
		endDate = prescription.StartDate.Add(24 * time.Hour)
	}

	status := domain.ReminderStatusExpired
	if prescription.Status == domain.PrescriptionStatusDiscontinued {
		status = domain.ReminderStatusCanceled
	}

	reminder := &domain.Reminder{
		ID:             primitive.NewObjectID(),
		PatientID:      prescription.PatientID,
		Kind:           domain.KindMedication,
		Message:        strings.Join(messages, "; "),
		Times:          times,
		DaysOfWeek:     prescription.DaysOfWeek,
		Timezone:       prescription.Timezone,
		Status:         status,
		StartDate:      prescription.StartDate,
		EndDate:        endDate,
		PrescriptionID: &prescription.ID,
		CreatedBy:      prescribedBy,
	}

	if _, err := s.reminderRepo.Create(ctx, reminder); err != nil {
		return false, err
	}
	// reminderRepo.Create hard-codes CreatedAt to time.Now(); pin it back to
	// StartDate so the reminder doesn't look like it was set up just now
	// while everything else about it (StartDate/EndDate/Status) says it's
	// long since expired.
	if err := s.backdateCreatedAt(ctx, "reminders", reminder.ID, prescription.StartDate); err != nil {
		return false, err
	}
	return true, nil
}

// seedReminders creates standalone "measure" reminders (e.g. reminders to
// take vitals). "medication" reminders are never created here - they only
// come from seedPrescriptions, via ensureMedicationReminder, matching how the
// real API only lets prescriptions create medication reminders.
func (s *Seeder) seedReminders(ctx context.Context, data *seedData) error {
	count, err := s.countCollection(ctx, "reminders", bson.M{"kind": domain.KindMeasure})
	if err != nil {
		return err
	}
	if count >= seedCount {
		log.Printf("[seed] measure reminders: %d total (0 created)", count)
		return nil
	}

	created := 0
	now := time.Now().UTC()

	for i := int(count); i < seedCount; i++ {
		patient := data.patients[i]
		message := fmt.Sprintf("Đo các chỉ số sinh tồn cho bệnh nhân %02d", i+1)

		// No Temporal workflow is started for seeded reminders (seeding writes
		// straight to Mongo, bypassing reminderService.CreateReminder), so the
		// window must already be closed - otherwise this would look like a
		// still-firing reminder that never actually fires.
		startDate := now.AddDate(0, -3, -(i % 10))
		endDate := now.AddDate(0, 0, -(7 + i%14))

		reminder := &domain.Reminder{
			ID:         primitive.NewObjectID(),
			PatientID:  patient.ID,
			Kind:       domain.KindMeasure,
			Message:    message,
			Times:      []domain.ReminderTime{{Hour: 8 + (i % 10), Minute: (i * 5) % 60}},
			DaysOfWeek: allDaysOfWeek(),
			Timezone:   seedTimezone,
			Status:     domain.ReminderStatusExpired,
			StartDate:  startDate,
			EndDate:    endDate,
			CreatedBy:  data.doctors[i%len(data.doctors)].ID,
		}

		if _, err := s.reminderRepo.Create(ctx, reminder); err != nil {
			return err
		}
		// reminderRepo.Create hard-codes CreatedAt to time.Now(); pin it back
		// to StartDate, same as the medication reminders created above.
		if err := s.backdateCreatedAt(ctx, "reminders", reminder.ID, startDate); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] measure reminders: %d total (%d created)", seedCount, created)
	return nil
}

// seedMedicationIntakes creates one intake record per dose slot in each
// patient's own prescription, so the seeded intake history fully matches
// that prescription's medications instead of covering only one random dose.
// It is idempotent per (patient, prescription, drug, dose, day) via
// FindBySlot, matching the unique index the real intake collection enforces.
func (s *Seeder) seedMedicationIntakes(ctx context.Context, data *seedData) error {
	created := 0
	skipped := 0
	now := time.Now().UTC()

	for i := 0; i < seedCount; i++ {
		patient := data.patients[i]
		prescription := data.prescriptions[i]

		slot := 0
		for _, medication := range prescription.Medications {
			for _, dose := range medication.Schedule {
				scheduledDate, takenAt := medicationIntakeSchedule(prescription, dose, i+slot, now)
				slot++

				existing, err := s.medicationIntakeRepo.FindBySlot(ctx, patient.ID, prescription.ID, medication.DrugName, dose, scheduledDate)
				if err != nil {
					return err
				}
				if existing != nil {
					skipped++
					continue
				}

				intake := &domain.MedicationIntake{
					ID:             primitive.NewObjectID(),
					PatientID:      patient.ID,
					PrescriptionID: prescription.ID,
					DrugName:       medication.DrugName,
					Dosage:         medication.Dosage,
					Dose:           dose,
					ScheduledDate:  scheduledDate,
					TakenAt:        takenAt,
				}

				if _, err := s.medicationIntakeRepo.Create(ctx, intake); err != nil {
					return err
				}
				// medicationIntakeRepo.Create hard-codes CreatedAt to
				// time.Now(); pin it back to TakenAt, since CreatedAt is
				// meant to record when the "mark as taken" event happened.
				if err := s.backdateCreatedAtOnly(ctx, "medication_intakes", intake.ID, takenAt); err != nil {
					return err
				}
				created++
			}
		}
	}

	log.Printf("[seed] medication intakes: %d created (%d already existed)", created, skipped)
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
	// ScheduledAt is always in the past (see daysAgoWithin), so an appointment
	// can never still be "scheduled" (pending) by the time it's seeded - that
	// slot has already come and gone. Only completed/canceled are consistent
	// outcomes for a past-dated appointment.
	statuses := []domain.FollowUpAppointmentStatus{
		domain.FollowUpAppointmentStatusCompleted,
		domain.FollowUpAppointmentStatusCanceled,
	}

	for i := int(count); i < seedCount; i++ {
		doctor := data.doctors[i%len(data.doctors)]
		scheduledAt := daysAgoWithin(i, 60)
		// bookedAt: when the appointment was made, comfortably before the
		// visit itself actually happened.
		bookedAt := scheduledAt.Add(-time.Duration(3+i%11) * 24 * time.Hour)

		patient := data.patients[i]
		appointment := &domain.FollowUpAppointment{
			ID:              primitive.NewObjectID(),
			PatientID:       patient.ID,
			DoctorID:        doctor.ID,
			ScheduledAt:     scheduledAt,
			DurationMinutes: pick([]int{15, 30, 45, 60}, i),
			Timezone:        seedTimezone,
			Location: ClinicLocationForDisease(
				patient.DiseaseTypes.BloodPressure,
				patient.DiseaseTypes.Glucose,
				i,
			),
			Notes:     fmt.Sprintf("Lịch tái khám %02d", i+1),
			Status:    pick(statuses, i),
			CreatedBy: doctor.ID,
		}

		if _, err := s.followUpAppointmentRepo.Create(ctx, appointment); err != nil {
			return err
		}
		// followUpAppointmentRepo.Create hard-codes CreatedAt to time.Now();
		// pin it back to when the appointment was booked, not to the seed
		// run's wall-clock.
		if err := s.backdateCreatedAt(ctx, "follow_up_appointments", appointment.ID, bookedAt); err != nil {
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

			// conversationRepo.Create hard-codes CreatedAt to time.Now().
			// loadConversations below re-sorts by createdAt ascending, so the
			// offset must stay monotonic in i (older index -> older
			// conversation) or seedMessages' index-based lookups into the
			// reloaded slice would end up paired with the wrong conversation.
			conversationCreatedAt := time.Now().UTC().Add(-time.Duration(seedCount-i) * 24 * time.Hour)
			if err := s.backdateCreatedAt(ctx, "conversations", conversation.ID, conversationCreatedAt); err != nil {
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
			Content:        fmt.Sprintf("Tin nhắn mẫu %02d: hãy theo dõi các chỉ số sức khỏe của bạn hôm nay.", i+1),
		}

		createdMessage, err := s.messageRepo.Create(ctx, message)
		if err != nil {
			return err
		}
		// messageRepo.Create hard-codes CreatedAt to time.Now(); anchor it a
		// few hours after the conversation's own (already-backdated)
		// CreatedAt so the message doesn't look like it was sent the instant
		// the seed ran, days after the conversation supposedly started.
		messageCreatedAt := conversation.CreatedAt.Add(time.Duration(1+i%6) * time.Hour)
		if err := s.backdateCreatedAtOnly(ctx, "messages", createdMessage.ID, messageCreatedAt); err != nil {
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
			fmt.Sprintf("Hoạt động mẫu %02d", i+1),
		)
		entry.Resource = pick([]string{"patient", "doctor", "department", "prescription"}, i)
		entry.Method = "POST"
		entry.Path = "/api/v1/seed"
		entry.StatusCode = 200

		if err := s.activityLogRepo.Create(ctx, entry); err != nil {
			return err
		}
		// activityLogRepo.Create hard-codes CreatedAt to time.Now(); spread
		// entries across the past so the audit trail doesn't look like a
		// burst of activity that all happened in the same second.
		if err := s.backdateCreatedAtOnly(ctx, "activity_logs", entry.ID, daysAgoWithin(i, 45)); err != nil {
			return err
		}
		created++
	}

	log.Printf("[seed] activity logs: %d total (%d created)", seedCount, created)
	return nil
}
