package seed

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	userRepo "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// RunAppend adds appendExtraPatientsPerDoctor new patients to every active
// doctor in the database, without dropping existing data. Each new patient is
// built to satisfy the same constraints the newer migrations enforce:
//
//   - diseaseTypes match the doctor's specialization, the same mapping
//     migrate_patient_care_team uses (Tim mạch → THA, Nội tiết → ĐTĐ,
//     Nội Tổng quát → both), so the care team stays specialty-consistent.
//   - the assigned nurse comes from the same department as the doctor.
//   - phoneLookupHash is set (when FIELD_ENCRYPTION_KEY is configured) so the
//     register-flow duplicate-phone check and phone lookups see these accounts.
//   - medical history comes from PatientMedicalHistory, aligned with the
//     patient's diseases.
//
// Every patient also gets the full past-dated bundle of related records:
// assignment, threshold, measurement history (16–24 readings + alerts),
// prescription, medication reminder, measure reminder, medication intakes,
// follow-up appointments, and a doctor–patient conversation.
//
// Requires a prior full seed (admin@gmail.com and at least one nurse must
// exist). Re-running with an unchanged doctor set is idempotent; if doctors
// were added/removed in between, existing appended patients are reused as-is
// and only the missing ones are created.
func RunAppend(ctx context.Context, db *mongo.Database) error {
	if appendExtraPatientsPerDoctor > appendPatientsPerDoctorStride {
		return fmt.Errorf(
			"appendExtraPatientsPerDoctor (%d) exceeds appendPatientsPerDoctorStride (%d); patient indexes would overlap across doctors",
			appendExtraPatientsPerDoctor, appendPatientsPerDoctorStride,
		)
	}

	s := NewSeeder(db)

	admin, err := s.baseUserRepo.FindByEmail(ctx, adminEmail)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return fmt.Errorf("admin %q not found; run full seed first", adminEmail)
		}
		return fmt.Errorf("load admin: %w", err)
	}

	doctors, err := s.doctorRepo.FindStaffs(ctx, userRepo.UserFilter{Limit: 10000})
	if err != nil {
		return fmt.Errorf("load doctors: %w", err)
	}
	if len(doctors) == 0 {
		return fmt.Errorf("no doctors found; run full seed first")
	}
	// Stable ordering so patient indexes (and therefore emails) stay
	// deterministic across re-runs with the same doctor set.
	sort.Slice(doctors, func(i, j int) bool { return doctors[i].Email < doctors[j].Email })

	nurses, err := s.nurseRepo.FindStaffs(ctx, userRepo.UserFilter{Limit: 10000})
	if err != nil {
		return fmt.Errorf("load nurses: %w", err)
	}
	if len(nurses) == 0 {
		return fmt.Errorf("no nurses found; run full seed first")
	}
	sort.Slice(nurses, func(i, j int) bool { return nurses[i].Email < nurses[j].Email })

	hashedShared, err := util.HashPassword(seedSharedPassword)
	if err != nil {
		return err
	}

	patientsCreated := 0
	bundlesCreated := 0
	nurseRR := map[string]int{}

	for doctorIdx := range doctors {
		doctor := &doctors[doctorIdx]
		disease := diseaseTypesForSpecialization(doctor.Specialization)

		alreadySeeded, err := s.appendDoctorRangeComplete(ctx, doctorIdx, doctor)
		if err != nil {
			return fmt.Errorf("check doctor %s: %w", doctor.Email, err)
		}
		if alreadySeeded {
			bundlesCreated += appendExtraPatientsPerDoctor
			log.Printf(
				"[seed-append] doctor %d/%d (%s) already fully seeded, skipping",
				doctorIdx+1, len(doctors), doctor.Email,
			)
			continue
		}

		for p := range appendExtraPatientsPerDoctor {
			patientIndex := appendPatientIndexBase + doctorIdx*appendPatientsPerDoctorStride + p
			nurse := pickAppendNurse(nurses, doctor.DepartmentID, nurseRR)

			patient, created, err := s.ensureAppendPatient(ctx, patientIndex, disease, hashedShared)
			if err != nil {
				return fmt.Errorf("ensure patient %d: %w", patientIndex, err)
			}
			if created {
				patientsCreated++
			}

			if err := s.seedAppendPatientBundle(ctx, patientIndex, patient, doctor, nurse, admin); err != nil {
				return fmt.Errorf("seed bundle for patient %s: %w", patient.Email, err)
			}
			bundlesCreated++
		}

		log.Printf(
			"[seed-append] doctor %d/%d (%s) done: %d patients ensured so far",
			doctorIdx+1, len(doctors), doctor.Email, bundlesCreated,
		)
	}

	log.Printf(
		"[seed-append] completed: %d doctors, %d patients created, %d patient bundles ensured",
		len(doctors), patientsCreated, bundlesCreated,
	)
	return nil
}

// appendDoctorRangeComplete reports whether this doctor's whole append range
// was already fully seeded by a previous run, so the doctor can be skipped
// with two queries instead of re-verifying every record of all their
// patients. It relies on the bundle running strictly in order: the message
// exchange is the very last step of the very last patient, so "last patient
// exists and their conversation with this doctor has messages" implies every
// earlier patient and bundle step completed. Any mismatch (doctor set changed
// between runs, partially seeded range) just falls back to the full
// per-patient ensure pass.
func (s *Seeder) appendDoctorRangeComplete(
	ctx context.Context,
	doctorIdx int,
	doctor *userDomain.Doctor,
) (bool, error) {
	lastIndex := appendPatientIndexBase + doctorIdx*appendPatientsPerDoctorStride + appendExtraPatientsPerDoctor - 1
	lastPatient, err := s.patientRepo.FindPatientByEmail(ctx, seedEmail("patient", lastIndex))
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
		return false, err
	}

	conversation, err := s.findConversationForPair(ctx, doctor.ID, lastPatient.ID)
	if err != nil || conversation == nil {
		return false, err
	}
	messageCount, err := s.countCollection(ctx, "messages", bson.M{"conversationId": conversation.ID})
	if err != nil {
		return false, err
	}
	return messageCount > 0, nil
}

// diseaseTypesForSpecialization is the inverse of migrate_patient_care_team's
// preferredSpecialty mapping, so a patient seeded for a doctor always prefers
// exactly that doctor's specialty:
//
//	Tim mạch      ← bp only
//	Nội tiết      ← glucose only
//	Nội Tổng quát ← both (also the fallback for unknown specializations)
func diseaseTypesForSpecialization(spec string) userDomain.DiseaseTypes {
	switch strings.TrimSpace(spec) {
	case "Tim mạch":
		return userDomain.DiseaseTypes{BloodPressure: true}
	case "Nội tiết":
		return userDomain.DiseaseTypes{Glucose: true}
	default:
		return userDomain.DiseaseTypes{BloodPressure: true, Glucose: true}
	}
}

// pickAppendNurse round-robins among the nurses of the doctor's own
// department (matching migrate_patient_care_team's pickNurse), falling back
// to all nurses when the department has none.
func pickAppendNurse(nurses []userDomain.Nurse, doctorDept primitive.ObjectID, rr map[string]int) *userDomain.Nurse {
	key := doctorDept.Hex()
	pool := make([]*userDomain.Nurse, 0, len(nurses))
	for i := range nurses {
		if nurses[i].DepartmentID == doctorDept {
			pool = append(pool, &nurses[i])
		}
	}
	if len(pool) == 0 {
		key = "*"
		for i := range nurses {
			pool = append(pool, &nurses[i])
		}
	}
	idx := rr[key] % len(pool)
	rr[key]++
	return pool[idx]
}

// appendAccountCreatedAt is the bounded counterpart of accountCreatedAt:
// append patient indexes start at appendPatientIndexBase, which would make
// accountCreatedAt produce absurdly old accounts. The 150–179 day window
// keeps every seeded record within roughly the last 6 months while still
// safely predating the assignment (account + ≤8 days), the threshold
// (95–115 days ago) and every measurement (≤ ~30 days ago).
func appendAccountCreatedAt(index int) time.Time {
	return time.Now().UTC().AddDate(0, 0, -(150 + index%30))
}

func (s *Seeder) ensureAppendPatient(
	ctx context.Context,
	index int,
	disease userDomain.DiseaseTypes,
	hashedPassword string,
) (*userDomain.Patient, bool, error) {
	email := seedEmail("patient", index)
	if existing, err := s.patientRepo.FindPatientByEmail(ctx, email); err == nil {
		return existing, false, nil
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return nil, false, err
	}

	phone := fmt.Sprintf("0904%06d", index+1)
	patient := &userDomain.Patient{
		BaseUser: userDomain.BaseUser{
			Role:     userDomain.RolePatient,
			Name:     seedPersonName(index, 29),
			Email:    email,
			Password: hashedPassword,
			Provider: localProvider,
			Gender:   seedGender(index),
			Dob:      seedDob(index, 1975),
			Phone:    phone,
			Status:   userDomain.StatusActive,
		},
		InsuranceNumber:       fmt.Sprintf("INS-2024-%04d", index+1),
		CCCD:                  fmt.Sprintf("00107501%04d", index+1),
		EmergencyContactName:  seedPersonName(index, 41),
		EmergencyContactPhone: fmt.Sprintf("0909%06d", index+1),
		DiseaseTypes:          disease,
	}
	patient.MedicalHistory = PatientMedicalHistory(index, disease.BloodPressure, disease.Glucose)

	// Real registrations always store a phoneLookupHash (unique partial index
	// ux_user_phone_lookup); mirror that so duplicate-phone checks and phone
	// lookups also cover seeded patients. Skipped when field encryption is
	// off, matching the seeder's tolerant handling of a missing key.
	if s.fieldCrypto != nil && s.fieldCrypto.Enabled() {
		phoneHash, err := util.HashPhoneForLookup(phone)
		if err != nil {
			return nil, false, fmt.Errorf("phone lookup hash: %w", err)
		}
		patient.PhoneLookupHash = phoneHash
	}

	createdPatient, err := s.patientRepo.Create(ctx, patient)
	if err != nil {
		return nil, false, err
	}
	if err := s.backdateCreatedAt(ctx, "users", createdPatient.ID, appendAccountCreatedAt(index)); err != nil {
		return nil, false, err
	}
	return createdPatient, true, nil
}

// seedAppendPatientBundle creates the same related records a full-seed patient
// gets (assignment, threshold, measurement history + alerts, prescription,
// reminders, intakes, follow-ups, conversation/messages), idempotently,
// without touching unrelated existing documents.
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

	if err := s.ensureAppendFollowUps(ctx, index, patient, doctor); err != nil {
		return fmt.Errorf("follow-ups: %w", err)
	}

	conversation, err := s.ensureAppendConversation(ctx, index, patient, doctor)
	if err != nil {
		return fmt.Errorf("conversation: %w", err)
	}

	if err := s.ensureAppendMessages(ctx, index, conversation, patient, doctor); err != nil {
		return fmt.Errorf("messages: %w", err)
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

	assignedAt := appendAccountCreatedAt(index).AddDate(0, 0, 1+index%7)
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

// ensureAppendFollowUps seeds two past appointments per patient: an older
// completed routine check-up and a more recent one that either completed or
// was canceled. Both stay strictly in the past — a seeded "scheduled"
// appointment would imply a pending Temporal workflow that never exists.
func (s *Seeder) ensureAppendFollowUps(
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

	recentAt := daysAgoWithin(index, 30)
	appointments := []struct {
		scheduledAt time.Time
		status      domain.FollowUpAppointmentStatus
		notes       string
	}{
		{
			scheduledAt: recentAt.AddDate(0, 0, -(35 + index%25)),
			status:      domain.FollowUpAppointmentStatusCompleted,
			notes:       "Tái khám định kỳ, đánh giá đáp ứng điều trị",
		},
		{
			scheduledAt: recentAt,
			status: pick([]domain.FollowUpAppointmentStatus{
				domain.FollowUpAppointmentStatusCompleted,
				domain.FollowUpAppointmentStatusCanceled,
			}, index),
			notes: "Tái khám theo hẹn, xem lại chỉ số theo dõi tại nhà",
		},
	}

	for i, a := range appointments {
		bookedAt := a.scheduledAt.Add(-time.Duration(3+(index+i)%11) * 24 * time.Hour)
		appointment := &domain.FollowUpAppointment{
			ID:              primitive.NewObjectID(),
			PatientID:       patient.ID,
			DoctorID:        doctor.ID,
			ScheduledAt:     a.scheduledAt,
			DurationMinutes: pick([]int{15, 30, 45, 60}, index+i),
			Timezone:        seedTimezone,
			Location: ClinicLocationForDisease(
				patient.DiseaseTypes.BloodPressure,
				patient.DiseaseTypes.Glucose,
				index+i,
			),
			Notes:     a.notes,
			Status:    a.status,
			CreatedBy: doctor.ID,
		}
		if _, err := s.followUpAppointmentRepo.Create(ctx, appointment); err != nil {
			return err
		}
		if err := s.backdateCreatedAt(ctx, "follow_up_appointments", appointment.ID, bookedAt); err != nil {
			return err
		}
	}
	return nil
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

// ensureAppendMessages seeds a short doctor–patient exchange instead of a
// single one-way message, so seeded conversations look like a monitoring
// relationship that has actually been used.
func (s *Seeder) ensureAppendMessages(
	ctx context.Context,
	index int,
	conversation *chatDomain.Conversation,
	patient *userDomain.Patient,
	doctor *userDomain.Doctor,
) error {
	count, err := s.countCollection(ctx, "messages", bson.M{"conversationId": conversation.ID})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	exchange := []struct {
		sender  primitive.ObjectID
		content string
	}{
		{doctor.ID, fmt.Sprintf("Chào %s, tôi đã xem các chỉ số anh/chị đo gần đây. Nhìn chung ổn định, anh/chị nhớ đo đúng giờ như lịch nhắc nhé.", patient.Name)},
		{patient.ID, "Dạ vâng bác sĩ, tôi vẫn đo đều mỗi sáng và tối theo lịch ạ."},
		{doctor.ID, "Tốt lắm. Nếu thấy chóng mặt, đau đầu hoặc chỉ số vượt ngưỡng thì báo ngay cho tôi qua đây."},
		{patient.ID, "Dạ, tôi cảm ơn bác sĩ ạ."},
	}

	var latestID primitive.ObjectID
	for i, m := range exchange {
		senderID := m.sender
		message := &chatDomain.Message{
			ID:             primitive.NewObjectID(),
			ConversationID: conversation.ID,
			MessageSource:  chatDomain.UserMessage,
			SenderID:       &senderID,
			Content:        m.content,
		}
		createdMessage, err := s.messageRepo.Create(ctx, message)
		if err != nil {
			return err
		}
		messageCreatedAt := conversation.CreatedAt.
			Add(time.Duration(1+index%6) * time.Hour).
			Add(time.Duration(i*(7+index%9)) * time.Minute)
		if err := s.backdateCreatedAtOnly(ctx, "messages", createdMessage.ID, messageCreatedAt); err != nil {
			return err
		}
		latestID = createdMessage.ID
	}
	return s.conversationRepo.SetLatestMessage(ctx, conversation.ID, latestID)
}
