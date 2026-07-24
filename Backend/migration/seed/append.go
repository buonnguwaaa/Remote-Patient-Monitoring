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
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// RunAppend adds extra patients (and related domain records) for
// doctor@gmail.com and seed doctors 1..10 without dropping existing data.
// Requires a prior full seed so those doctors, nurses, and an admin exist.
func RunAppend(ctx context.Context, db *mongo.Database) error {
	s := NewSeeder(db)

	admins, err := s.loadSeedAdmins(ctx)
	if err != nil {
		return fmt.Errorf("load admins: %w", err)
	}
	doctors, err := s.loadAppendTargetDoctors(ctx)
	if err != nil {
		return fmt.Errorf("load target doctors: %w", err)
	}
	nurses, err := s.loadSeedNurses(ctx)
	if err != nil {
		return fmt.Errorf("load nurses: %w", err)
	}

	hashedShared, err := util.HashPassword(seedSharedPassword)
	if err != nil {
		return err
	}

	patientsCreated := 0
	bundlesCreated := 0

	for doctorIdx, doctor := range doctors {
		for p := 0; p < appendExtraPatientsPerDoctor; p++ {
			patientIndex := appendPatientIndexBase + doctorIdx*appendExtraPatientsPerDoctor + p
			nurse := nurses[patientIndex%len(nurses)]

			patient, created, err := s.ensureAppendPatient(ctx, patientIndex, hashedShared)
			if err != nil {
				return fmt.Errorf("ensure patient %d: %w", patientIndex, err)
			}
			if created {
				patientsCreated++
			}

			if err := s.seedAppendPatientBundle(ctx, patientIndex, patient, doctor, nurse, admins[0]); err != nil {
				return fmt.Errorf("seed bundle for patient %s: %w", patient.Email, err)
			}
			bundlesCreated++
		}
	}

	log.Printf(
		"[seed-append] completed: %d target doctors, %d patients created, %d patient bundles ensured",
		len(doctors), patientsCreated, bundlesCreated,
	)
	return nil
}

func (s *Seeder) loadSeedAdmins(ctx context.Context) ([]*userDomain.BaseUser, error) {
	result := make([]*userDomain.BaseUser, 0, adminCount)
	for i := 0; i < adminCount; i++ {
		email := seedEmail("admin", i)
		admin, err := s.baseUserRepo.FindByEmail(ctx, email)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, fmt.Errorf("admin %q not found; run full seed first", email)
			}
			return nil, err
		}
		result = append(result, admin)
	}
	return result, nil
}

func (s *Seeder) loadAppendTargetDoctors(ctx context.Context) ([]*userDomain.Doctor, error) {
	result := make([]*userDomain.Doctor, 0, appendDoctorMaxIndex+1)
	for i := 0; i <= appendDoctorMaxIndex; i++ {
		email := seedEmail("doctor", i)
		doctor, err := s.doctorRepo.FindStaffByEmail(ctx, email)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, fmt.Errorf("doctor %q not found; run full seed first", email)
			}
			return nil, err
		}
		result = append(result, doctor)
	}
	return result, nil
}

func (s *Seeder) loadSeedNurses(ctx context.Context) ([]*userDomain.Nurse, error) {
	result := make([]*userDomain.Nurse, 0, seedCount)
	for i := 0; i < seedCount; i++ {
		email := seedEmail("nurse", i)
		nurse, err := s.nurseRepo.FindStaffByEmail(ctx, email)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				if i == 0 {
					return nil, fmt.Errorf("nurse %q not found; run full seed first", email)
				}
				break
			}
			return nil, err
		}
		result = append(result, nurse)
	}
	if len(result) == 0 {
		return nil, fmt.Errorf("no nurses found; run full seed first")
	}
	return result, nil
}

func (s *Seeder) ensureAppendPatient(
	ctx context.Context,
	index int,
	hashedPassword string,
) (*userDomain.Patient, bool, error) {
	email := seedEmail("patient", index)
	if existing, err := s.patientRepo.FindPatientByEmail(ctx, email); err == nil {
		return existing, false, nil
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, false, err
	}

	patient := &userDomain.Patient{
		BaseUser: userDomain.BaseUser{
			Role:     userDomain.RolePatient,
			Name:     seedPersonName(index, 29),
			Email:    email,
			Password: hashedPassword,
			Provider: localProvider,
			Gender:   seedGender(index),
			Dob:      seedDob(index, 1975),
			Phone:    fmt.Sprintf("0904%06d", index+1),
			Status:   userDomain.StatusActive,
		},
		InsuranceNumber:       fmt.Sprintf("INS-2024-%04d", index+1),
		CCCD:                  fmt.Sprintf("00107501%04d", index+1),
		EmergencyContactName:  seedPersonName(index, 41),
		EmergencyContactPhone: fmt.Sprintf("0909%06d", index+1),
		DiseaseTypes: userDomain.DiseaseTypes{
			BloodPressure: index%2 == 0,
			Glucose:       index%3 != 0,
		},
	}
	patient.MedicalHistory = PatientMedicalHistory(index, patient.DiseaseTypes.BloodPressure, patient.DiseaseTypes.Glucose)

	createdPatient, err := s.patientRepo.Create(ctx, patient)
	if err != nil {
		return nil, false, err
	}
	if err := s.backdateCreatedAt(ctx, "users", createdPatient.ID, accountCreatedAt(index)); err != nil {
		return nil, false, err
	}
	return createdPatient, true, nil
}

// seedAppendPatientBundle creates the same related records a full-seed patient
// gets (assignment, threshold, measurement, prescription, reminders, intakes,
// follow-up, conversation/message, alert), idempotently, without touching
// unrelated existing documents.
func (s *Seeder) seedAppendPatientBundle(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
	nurse *userDomain.Nurse,
	admin *userDomain.BaseUser,
) error {
	if err := s.ensureAppendAssignment(ctx, index, patient, doctor, nurse, admin); err != nil {
		return fmt.Errorf("assignment: %w", err)
	}

	if _, err := s.ensureAppendThreshold(ctx, index, patient, doctor); err != nil {
		return fmt.Errorf("threshold: %w", err)
	}

	if _, _, err := s.ensurePatientMeasurementHistory(ctx, patient, index); err != nil {
		return fmt.Errorf("measurement history: %w", err)
	}

	prescription, err := s.ensureAppendPrescription(ctx, index, patient, doctor)
	if err != nil {
		return fmt.Errorf("prescription: %w", err)
	}

	if _, err := s.ensureMedicationReminder(ctx, prescription, doctor.ID); err != nil {
		return fmt.Errorf("medication reminder: %w", err)
	}

	if err := s.ensureAppendMeasureReminder(ctx, index, patient, doctor); err != nil {
		return fmt.Errorf("measure reminder: %w", err)
	}

	if err := s.ensureAppendMedicationIntakes(ctx, index, patient, prescription); err != nil {
		return fmt.Errorf("medication intakes: %w", err)
	}

	if err := s.ensureAppendFollowUp(ctx, index, patient, doctor); err != nil {
		return fmt.Errorf("follow-up: %w", err)
	}

	conversation, err := s.ensureAppendConversation(ctx, index, patient, doctor)
	if err != nil {
		return fmt.Errorf("conversation: %w", err)
	}

	if err := s.ensureAppendMessage(ctx, index, conversation, doctor); err != nil {
		return fmt.Errorf("message: %w", err)
	}

	return nil
}

func (s *Seeder) ensureAppendAssignment(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
	nurse *userDomain.Nurse,
	admin *userDomain.BaseUser,
) error {
	if _, err := s.assignmentRepo.FindByPatientID(ctx, patient.ID); err == nil {
		return nil
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return err
	}

	assignedAt := accountCreatedAt(index).AddDate(0, 0, 1+index%7)
	assignment := &domain.Assignment{
		ID:         primitive.NewObjectID(),
		PatientID:  patient.ID,
		DoctorID:   doctor.ID,
		NurseID:    nurse.ID,
		AssignedBy: admin.ID,
		CreatedAt:  assignedAt,
		UpdatedAt:  assignedAt,
	}
	_, err := s.assignmentRepo.Create(ctx, assignment)
	return err
}

func (s *Seeder) ensureAppendThreshold(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
) (*domain.Threshold, error) {
	existing, err := s.thresholdRepo.FindWithFilter(ctx, repository.ThresholdFilter{
		PatientID: patient.ID.Hex(),
	})
	if err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		return &existing[0], nil
	}

	glucoseMin := 70.0
	glucoseMax := 140.0
	now := time.Now().UTC()
	threshold := &domain.Threshold{
		ID:                 primitive.NewObjectID(),
		PatientID:          patient.ID,
		DoctorID:           doctor.ID,
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
		EffectiveFrom:      now.AddDate(0, 0, -(95 + index%20)),
	}
	createdThreshold, err := s.thresholdRepo.Create(ctx, threshold)
	if err != nil {
		return nil, err
	}
	if err := s.backdateCreatedAt(ctx, "thresholds", createdThreshold.ID, threshold.EffectiveFrom); err != nil {
		return nil, err
	}
	createdThreshold.CreatedAt = threshold.EffectiveFrom
	createdThreshold.UpdatedAt = threshold.EffectiveFrom
	return createdThreshold, nil
}

func (s *Seeder) ensureAppendPrescription(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
) (*domain.Prescription, error) {
	existing, err := s.prescriptionRepo.FindWithFilter(ctx, repository.PrescriptionFilter{
		PatientID: patient.ID.Hex(),
	})
	if err != nil {
		return nil, err
	}
	if len(existing) > 0 {
		return &existing[0], nil
	}

	now := time.Now().UTC()
	startDate := now.Add(-time.Duration(index%60+3) * 24 * time.Hour)
	profile := buildPrescriptionProfile(index, startDate)

	createdPrescription, err := s.prescriptionRepo.Create(ctx, &domain.Prescription{
		ID:           primitive.NewObjectID(),
		PatientID:    patient.ID,
		PrescribedBy: doctor.ID,
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
	if err := s.backdateCreatedAt(ctx, "prescriptions", createdPrescription.ID, startDate); err != nil {
		return nil, err
	}
	createdPrescription.CreatedAt = startDate
	createdPrescription.UpdatedAt = startDate
	return createdPrescription, nil
}

func (s *Seeder) ensureAppendMeasureReminder(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
) error {
	existing, err := s.reminderRepo.FindWithFilter(ctx, repository.ReminderFilter{
		PatientID: patient.ID.Hex(),
		Kind:      domain.KindMeasure,
	})
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}

	now := time.Now().UTC()
	startDate := now.AddDate(0, -3, -(index % 10))
	endDate := now.AddDate(0, 0, -(7 + index%14))
	reminder := &domain.Reminder{
		ID:         primitive.NewObjectID(),
		PatientID:  patient.ID,
		Kind:       domain.KindMeasure,
		Message:    fmt.Sprintf("Đo các chỉ số sinh tồn cho bệnh nhân %02d", index+1),
		Times:      []domain.ReminderTime{{Hour: 8 + (index % 10), Minute: (index * 5) % 60}},
		DaysOfWeek: allDaysOfWeek(),
		Timezone:   seedTimezone,
		Status:     domain.ReminderStatusExpired,
		StartDate:  startDate,
		EndDate:    endDate,
		CreatedBy:  doctor.ID,
	}
	if _, err := s.reminderRepo.Create(ctx, reminder); err != nil {
		return err
	}
	return s.backdateCreatedAt(ctx, "reminders", reminder.ID, startDate)
}

func (s *Seeder) ensureAppendMedicationIntakes(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	prescription *domain.Prescription,
) error {
	now := time.Now().UTC()
	slot := 0
	for _, medication := range prescription.Medications {
		for _, dose := range medication.Schedule {
			scheduledDate, takenAt := medicationIntakeSchedule(prescription, dose, index+slot, now)
			slot++

			existing, err := s.medicationIntakeRepo.FindBySlot(ctx, patient.ID, prescription.ID, medication.DrugName, dose, scheduledDate)
			if err != nil {
				return err
			}
			if existing != nil {
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
			if err := s.backdateCreatedAtOnly(ctx, "medication_intakes", intake.ID, takenAt); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Seeder) ensureAppendFollowUp(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
) error {
	count, err := s.countCollection(ctx, "follow_up_appointments", bson.M{"patientId": patient.ID})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	statuses := []domain.FollowUpAppointmentStatus{
		domain.FollowUpAppointmentStatusCompleted,
		domain.FollowUpAppointmentStatusCanceled,
	}
	scheduledAt := daysAgoWithin(index, 60)
	bookedAt := scheduledAt.Add(-time.Duration(3+index%11) * 24 * time.Hour)
	appointment := &domain.FollowUpAppointment{
		ID:              primitive.NewObjectID(),
		PatientID:       patient.ID,
		DoctorID:        doctor.ID,
		ScheduledAt:     scheduledAt,
		DurationMinutes: pick([]int{15, 30, 45, 60}, index),
		Timezone:        seedTimezone,
		Location:        fmt.Sprintf("Bệnh viện Đa khoa Thành phố - Phòng %d", 100+index%50),
		Notes:           fmt.Sprintf("Lịch tái khám %02d", index+1),
		Status:          pick(statuses, index),
		CreatedBy:       doctor.ID,
	}
	if _, err := s.followUpAppointmentRepo.Create(ctx, appointment); err != nil {
		return err
	}
	return s.backdateCreatedAt(ctx, "follow_up_appointments", appointment.ID, bookedAt)
}

func (s *Seeder) ensureAppendConversation(
	ctx context.Context,
	index int,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
) (*chatDomain.Conversation, error) {
	existing, err := s.findConversationForPair(ctx, doctor.ID, patient.ID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

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
	conversationCreatedAt := time.Now().UTC().Add(-time.Duration(30+index%60) * 24 * time.Hour)
	if err := s.backdateCreatedAt(ctx, "conversations", conversation.ID, conversationCreatedAt); err != nil {
		return nil, err
	}
	conversation.CreatedAt = conversationCreatedAt
	conversation.UpdatedAt = conversationCreatedAt
	return conversation, nil
}

func (s *Seeder) findConversationForPair(
	ctx context.Context,
	doctorID, patientID primitive.ObjectID,
) (*chatDomain.Conversation, error) {
	var c chatDomain.Conversation
	err := s.db.Collection("conversations").FindOne(ctx, bson.M{
		"participants.userId": bson.M{"$all": []primitive.ObjectID{doctorID, patientID}},
	}).Decode(&c)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Seeder) ensureAppendMessage(
	ctx context.Context,
	index int,
	conversation *chatDomain.Conversation,
	doctor *userDomain.Doctor,
) error {
	count, err := s.countCollection(ctx, "messages", bson.M{"conversationId": conversation.ID})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	senderID := doctor.ID
	message := &chatDomain.Message{
		ID:             primitive.NewObjectID(),
		ConversationID: conversation.ID,
		MessageSource:  chatDomain.UserMessage,
		SenderID:       &senderID,
		Content:        fmt.Sprintf("Tin nhắn mẫu %02d: hãy theo dõi các chỉ số sức khỏe của bạn hôm nay.", index+1),
	}
	createdMessage, err := s.messageRepo.Create(ctx, message)
	if err != nil {
		return err
	}
	messageCreatedAt := conversation.CreatedAt.Add(time.Duration(1+index%6) * time.Hour)
	if err := s.backdateCreatedAtOnly(ctx, "messages", createdMessage.ID, messageCreatedAt); err != nil {
		return err
	}
	return s.conversationRepo.SetLatestMessage(ctx, conversation.ID, createdMessage.ID)
}
