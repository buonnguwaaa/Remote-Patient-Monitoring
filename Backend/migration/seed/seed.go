package seed

import (
	"context"
	"fmt"
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	chatDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/chat"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	userRepo "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"go.mongodb.org/mongo-driver/mongo"
)

type Seeder struct {
	db                      *mongo.Database
	baseUserRepo            userRepo.BaseUserRepository
	patientRepo             userRepo.PatientRepository
	doctorRepo              userRepo.StaffRepository[userDomain.Doctor]
	nurseRepo               userRepo.StaffRepository[userDomain.Nurse]
	deptRepo                repository.DepartmentRepository
	assignmentRepo          repository.AssignmentRepository
	thresholdRepo           repository.ThresholdRepository
	measurementRepo         repository.MeasurementRepository
	prescriptionRepo        repository.PrescriptionRepository
	alertRepo               repository.AlertRepository
	reminderRepo            repository.ReminderRepository
	medicationIntakeRepo    repository.MedicationIntakeRepository
	followUpAppointmentRepo repository.FollowUpAppointmentRepository
	activityLogRepo         *repository.ActivityLogRepository
	conversationRepo        chatRepository.ConversationRepository
	messageRepo             chatRepository.MessageRepository
	usersCol                *mongo.Collection
}

type seedData struct {
	departments   []*domain.Department
	admins        []*userDomain.BaseUser
	doctors       []*userDomain.Doctor
	nurses        []*userDomain.Nurse
	patients      []*userDomain.Patient
	thresholds    []*domain.Threshold
	prescriptions []*domain.Prescription
	conversations []*chatDomain.Conversation
}

func NewSeeder(db *mongo.Database) *Seeder {
	return &Seeder{
		db:                      db,
		baseUserRepo:            userRepo.NewBaseUserRepository(db),
		patientRepo:             userRepo.NewPatientRepository(db),
		doctorRepo:              userRepo.NewStaffRepository[userDomain.Doctor](db),
		nurseRepo:               userRepo.NewStaffRepository[userDomain.Nurse](db),
		deptRepo:                repository.NewDepartmentRepository(db),
		assignmentRepo:          repository.NewAssignmentRepository(db),
		thresholdRepo:           repository.NewThresholdRepository(db),
		measurementRepo:         repository.NewMeasurementRepository(db),
		prescriptionRepo:        repository.NewPrescriptionRepository(db),
		alertRepo:               repository.NewAlertRepository(db),
		reminderRepo:            repository.NewReminderRepository(db),
		medicationIntakeRepo:    repository.NewMedicationIntakeRepository(db),
		followUpAppointmentRepo: repository.NewFollowUpAppointmentRepository(db),
		activityLogRepo:         repository.NewActivityLogRepository(db),
		conversationRepo:        chatRepository.NewConversationRepository(db),
		messageRepo:             chatRepository.NewMessageRepository(db),
		usersCol:                db.Collection("users"),
	}
}

// Run drops the database, then seeds default accounts and 50 records per domain.
// For additive seeding without dropping, use RunAppend.
func Run(ctx context.Context, db *mongo.Database) error {
	if err := DropDatabase(ctx, db); err != nil {
		return fmt.Errorf("drop database: %w", err)
	}

	s := NewSeeder(db)

	if err := s.baseUserRepo.EnsureIndexes(ctx); err != nil {
		return fmt.Errorf("ensure user indexes: %w", err)
	}

	data := &seedData{}

	var err error
	if data.departments, err = s.seedDepartments(ctx); err != nil {
		return fmt.Errorf("seed departments: %w", err)
	}
	if data.admins, err = s.seedAdmins(ctx); err != nil {
		return fmt.Errorf("seed admins: %w", err)
	}
	if data.doctors, err = s.seedDoctors(ctx, data.departments); err != nil {
		return fmt.Errorf("seed doctors: %w", err)
	}
	if data.nurses, err = s.seedNurses(ctx, data.departments); err != nil {
		return fmt.Errorf("seed nurses: %w", err)
	}
	if data.patients, err = s.seedPatients(ctx); err != nil {
		return fmt.Errorf("seed patients: %w", err)
	}
	if err := s.seedAssignments(ctx, data); err != nil {
		return fmt.Errorf("seed assignments: %w", err)
	}
	if data.thresholds, err = s.seedThresholds(ctx, data); err != nil {
		return fmt.Errorf("seed thresholds: %w", err)
	}
	if _, _, err = s.enrichPatientsMeasurementHistory(ctx, data.patients); err != nil {
		return fmt.Errorf("seed measurement history: %w", err)
	}
	if data.prescriptions, err = s.seedPrescriptions(ctx, data); err != nil {
		return fmt.Errorf("seed prescriptions: %w", err)
	}
	if err := s.seedReminders(ctx, data); err != nil {
		return fmt.Errorf("seed reminders: %w", err)
	}
	if err := s.seedMedicationIntakes(ctx, data); err != nil {
		return fmt.Errorf("seed medication intakes: %w", err)
	}
	if err := s.seedFollowUpAppointments(ctx, data); err != nil {
		return fmt.Errorf("seed follow-up appointments: %w", err)
	}
	if data.conversations, err = s.seedConversations(ctx, data); err != nil {
		return fmt.Errorf("seed conversations: %w", err)
	}
	if err := s.seedMessages(ctx, data); err != nil {
		return fmt.Errorf("seed messages: %w", err)
	}
	if err := s.seedActivityLogs(ctx, data); err != nil {
		return fmt.Errorf("seed activity logs: %w", err)
	}

	log.Printf("[seed] database seeding completed successfully (%d records per domain)", seedCount)
	return nil
}
