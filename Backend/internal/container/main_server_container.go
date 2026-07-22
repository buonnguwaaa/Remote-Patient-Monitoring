package container

import (
	"context"
	"log"
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/fcm"
	twilioClient "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/twilio"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cache"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handler"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/realtime"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	ws "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/ws"
)

type MainServerContainer struct {
	BaseUserRepo            userRepository.BaseUserRepository
	PatientRepo             userRepository.PatientRepository
	DoctorRepo              userRepository.StaffRepository[domain.Doctor]
	NurseRepo               userRepository.StaffRepository[domain.Nurse]
	TokenRepo               repository.TokenRepository
	TokenBlacklistRepo      repository.TokenBlacklistRepository
	NotificationTokenRepo   repository.NotificationTokenRepository
	NotificationRepo        repository.UserNotificationRepository
	MeasurementRepo         repository.MeasurementRepository
	ThresholdRepo           repository.ThresholdRepository
	AlertRepo               repository.AlertRepository
	DepartmentRepo          repository.DepartmentRepository
	AssignmentRepo          repository.AssignmentRepository
	ReminderRepo            repository.ReminderRepository
	PrescriptionRepo        repository.PrescriptionRepository
	MedicationIntakeRepo    repository.MedicationIntakeRepository
	FollowUpAppointmentRepo repository.FollowUpAppointmentRepository
	ConversationRepo        chatRepository.ConversationRepository
	MessageRepo             chatRepository.MessageRepository
	ActivityLogRepo         *repository.ActivityLogRepository
	VideoSessionRepo        repository.VideoSessionRepository

	AuthService                service.AuthService
	UserService                service.UserService
	MeasurementService         service.MeasurementService
	ThresholdService           service.ThresholdService
	AlertService               service.AlertService
	DepartmentService          service.DepartmentService
	AssignmentService          service.AssignmentService
	PatientOverviewService     service.PatientOverviewService
	ReminderService            service.ReminderService
	PrescriptionService        service.PrescriptionService
	MedicationIntakeService    service.MedicationIntakeService
	FollowUpAppointmentService service.FollowUpAppointmentService
	ChatService                service.ChatService
	NotificationService        service.NotificationService
	AccountNotifier            service.AccountNotifier
	VideoSessionService        service.VideoSessionService

	AuthHandler                *handler.AuthHandler
	UserHandler                *handler.UserHandler
	MeasurementHandler         *handler.MeasurementHandler
	ThresholdHandler           *handler.ThresholdHandler
	AlertHandler               *handler.AlertHandler
	DepartmentHandler          *handler.DepartmentHandler
	AssignmentHandler          *handler.AssignmentHandler
	PatientOverviewHandler     *handler.PatientOverviewHandler
	ReminderHandler            *handler.ReminderHandler
	PrescriptionHandler        *handler.PrescriptionHandler
	MedicationIntakeHandler    *handler.MedicationIntakeHandler
	FollowUpAppointmentHandler *handler.FollowUpAppointmentHandler
	ChatHandler                *handler.ChatHandler
	NotificationTokenHandler   *handler.NotificationTokenHandler
	NotificationHandler        *handler.NotificationHandler
	ActivityLogHandler         *handler.ActivityLogHandler
	VideoSessionHandler        *handler.VideoSessionHandler

	WSChatHandler *ws.Handler
	Hub           *ws.Hub

	RealtimeHub       *realtime.Hub
	RealtimeHandler   *realtime.Handler
	RealtimePublisher *realtime.RedisUserEventPublisher

	JWTManager *util.JWTManager

	CloudinaryService service.CloudinaryService
}

func NewMainServerContainer() *MainServerContainer {
	c := &MainServerContainer{}

	jwtSecret := os.Getenv("JWT_SECRET")
	c.JWTManager = util.NewJWTManager(jwtSecret)

	db := config.Mongo.Database

	// Cache-aside layer: reuses the same Redis client as pub/sub, namespaced
	// separately so cached keys never collide with pub/sub channels. Only
	// this HTTP server container reads through it - the Temporal worker
	// container always talks to MongoDB directly (see temporal_worker_container.go).
	cacheStore := cache.NewStore(config.Redis.Client, "cache")
	if !config.CacheEnabled() {
		cacheStore = cache.NewStore(nil, "cache")
	}
	cacheTTL := config.CacheDefaultTTL()

	fieldCrypto, err := util.LoadFieldEncryptorFromEnv()
	if err != nil {
		log.Fatalf("[FATAL] field encryption: %v", err)
	}
	if fieldCrypto.Enabled() {
		log.Println("[GIN-info] PHI field encryption (AES-256-GCM) enabled")
	} else {
		log.Println("[GIN-warn] PHI field encryption disabled (set FIELD_ENCRYPTION_KEY to enable)")
	}

	c.BaseUserRepo = userRepository.NewEncryptedBaseUserRepository(
		userRepository.NewCachedBaseUserRepository(userRepository.NewBaseUserRepository(db), cacheStore, cacheTTL),
		fieldCrypto,
	)
	// Encrypted wraps Cached so Redis stores ciphertext for sensitive fields.
	c.PatientRepo = userRepository.NewEncryptedPatientRepository(
		userRepository.NewCachedPatientRepository(userRepository.NewPatientRepository(db), cacheStore, cacheTTL),
		fieldCrypto,
	)
	c.DoctorRepo = userRepository.NewEncryptedStaffRepository(
		userRepository.NewCachedStaffRepository[domain.Doctor](userRepository.NewStaffRepository[domain.Doctor](db), cacheStore, cacheTTL),
		fieldCrypto,
	)
	c.NurseRepo = userRepository.NewEncryptedStaffRepository(
		userRepository.NewCachedStaffRepository[domain.Nurse](userRepository.NewStaffRepository[domain.Nurse](db), cacheStore, cacheTTL),
		fieldCrypto,
	)

	c.TokenRepo = repository.NewTokenRepository(db)
	c.TokenBlacklistRepo = repository.NewTokenBlacklistRepository(config.Redis.Client)
	c.NotificationTokenRepo = repository.NewNotificationTokenRepository(db)
	c.NotificationRepo = repository.NewUserNotificationRepository(db)
	c.MeasurementRepo = repository.NewCachedMeasurementRepository(repository.NewMeasurementRepository(db), cacheStore, cacheTTL)

	c.ThresholdRepo = repository.NewCachedThresholdRepository(repository.NewThresholdRepository(db), cacheStore, cacheTTL)
	c.DepartmentRepo = repository.NewCachedDepartmentRepository(repository.NewDepartmentRepository(db), cacheStore, cacheTTL)
	c.AssignmentRepo = repository.NewCachedAssignmentRepository(repository.NewAssignmentRepository(db), cacheStore, cacheTTL)
	c.AlertRepo = repository.NewCachedAlertRepository(repository.NewAlertRepository(db), c.AssignmentRepo, cacheStore, cacheTTL)
	c.ReminderRepo = repository.NewReminderRepository(db)
	c.PrescriptionRepo = repository.NewPrescriptionRepository(db)
	c.MedicationIntakeRepo = repository.NewMedicationIntakeRepository(db)
	c.FollowUpAppointmentRepo = repository.NewCachedFollowUpAppointmentRepository(repository.NewFollowUpAppointmentRepository(db), cacheStore, cacheTTL)
	c.ConversationRepo = chatRepository.NewConversationRepository(db)
	c.MessageRepo = chatRepository.NewEncryptedMessageRepository(chatRepository.NewMessageRepository(db), fieldCrypto)
	c.ActivityLogRepo = repository.NewActivityLogRepository(db)
	c.VideoSessionRepo = repository.NewVideoSessionRepository(db)

	if err := c.BaseUserRepo.EnsureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure user indexes: %v", err)
	}
	if err := c.ConversationRepo.EnsureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure conversation indexes: %v", err)
	}
	if err := c.MessageRepo.EnsureIndexes(context.Background()); err != nil {
		log.Printf("[WARN] failed to ensure message indexes: %v", err)
	}

	// Initialize FCM client for push notifications
	var fcmClient service.PushProvider
	if client, err := fcm.NewClientFromEnv(); err != nil {
		log.Printf("[WARN] FCM client not configured: %v", err)
	} else {
		fcmClient = client
	}

	c.RealtimePublisher = realtime.NewRedisUserEventPublisher(config.Redis.Client)

	c.NotificationService = service.NewNotificationService(c.NotificationTokenRepo, c.NotificationRepo, fcmClient, c.RealtimePublisher)
	var smsProvider service.SMSProvider
	if client, err := twilioClient.NewClientFromEnv(); err != nil {
		log.Printf("[WARN] Twilio client not configured: %v", err)
	} else {
		smsProvider = client
	}
	c.AccountNotifier = service.NewAccountNotifier(c.BaseUserRepo, c.NotificationService, smsProvider)

	c.AuthService = service.NewAuthService(c.BaseUserRepo, c.PatientRepo, c.TokenRepo, c.TokenBlacklistRepo, c.JWTManager, c.AccountNotifier)
	c.UserService = service.NewUserService(c.BaseUserRepo, c.PatientRepo, c.NurseRepo, c.DoctorRepo, c.AccountNotifier)
	c.MeasurementService = service.NewMeasurementService(c.PatientRepo, c.MeasurementRepo)
	c.ThresholdService = service.NewThresholdService(c.PatientRepo, c.DoctorRepo, c.ThresholdRepo)
	c.AlertService = service.NewAlertService(c.AlertRepo)
	c.DepartmentService = service.NewDepartmentService(c.DepartmentRepo, c.DoctorRepo, c.NurseRepo)
	c.NotificationService = service.NewNotificationService(c.NotificationTokenRepo, c.NotificationRepo, fcmClient, c.RealtimePublisher)
	c.AssignmentService = service.NewAssignmentService(c.AssignmentRepo, c.BaseUserRepo, c.DoctorRepo, c.NurseRepo, c.NotificationService)
	c.PatientOverviewService = service.NewPatientOverviewService(c.AssignmentRepo, c.PatientRepo, c.MeasurementRepo, c.ThresholdRepo, c.AlertRepo)
	c.ReminderService = service.NewReminderService(c.PatientRepo, c.ReminderRepo, c.AssignmentRepo)
	c.PrescriptionService = service.NewPrescriptionService(c.PatientRepo, c.PrescriptionRepo, c.ReminderRepo, c.ReminderService)
	c.MedicationIntakeService = service.NewMedicationIntakeService(c.PatientRepo, c.PrescriptionRepo, c.MedicationIntakeRepo, c.ReminderRepo)
	c.FollowUpAppointmentService = service.NewFollowUpAppointmentService(c.PatientRepo, c.AssignmentRepo, c.FollowUpAppointmentRepo)
	c.ChatService = service.NewChatService(c.ConversationRepo, c.MessageRepo, c.AssignmentRepo)
	c.VideoSessionService = service.NewVideoSessionService(c.VideoSessionRepo, c.AssignmentRepo, c.ChatService, nil) // RealtimePublisher wired below

	c.AuthHandler = handler.NewAuthHandler(c.AuthService)
	c.MeasurementHandler = handler.NewMeasurementHandler(c.MeasurementService)
	c.ThresholdHandler = handler.NewThresholdHandler(c.ThresholdService)
	c.AlertHandler = handler.NewAlertHandler(c.AlertService)
	c.DepartmentHandler = handler.NewDepartmentHandler(c.DepartmentService)
	c.AssignmentHandler = handler.NewAssignmentHandler(c.AssignmentService)
	c.PatientOverviewHandler = handler.NewPatientOverviewHandler(c.PatientOverviewService)
	c.ReminderHandler = handler.NewReminderHandler(c.ReminderService)
	c.PrescriptionHandler = handler.NewPrescriptionHandler(c.PrescriptionService)
	c.MedicationIntakeHandler = handler.NewMedicationIntakeHandler(c.MedicationIntakeService)
	c.FollowUpAppointmentHandler = handler.NewFollowUpAppointmentHandler(c.FollowUpAppointmentService)
	c.ChatHandler = handler.NewChatHandler(c.ChatService)
	c.NotificationTokenHandler = handler.NewNotificationTokenHandler(c.NotificationService)
	c.NotificationHandler = handler.NewNotificationHandler(c.NotificationService)
	c.ActivityLogHandler = handler.NewActivityLogHandler(c.ActivityLogRepo, c.AssignmentRepo, c.BaseUserRepo)

	// Wire RealtimePublisher into VideoSessionService after it is created below.
	c.Hub = ws.NewHub()
	go c.Hub.Run()
	if subscriber := ws.NewRedisChatEventSubscriber(config.Redis.Client, c.Hub); subscriber != nil {
		go func() {
			if err := subscriber.Start(context.Background()); err != nil {
				log.Printf("[GIN-error] redis chat subscriber stopped: %v", err)
			}
		}()
	}

	// Realtime notification hub + Redis subscriber
	c.RealtimeHub = realtime.NewHub()
	go c.RealtimeHub.Run()
	if rtSubscriber := realtime.NewRedisUserEventSubscriber(config.Redis.Client, c.RealtimeHub); rtSubscriber != nil {
		go func() {
			if err := rtSubscriber.Start(context.Background()); err != nil {
				log.Printf("[GIN-error] redis user-event subscriber stopped: %v", err)
			}
		}()
	}
	c.RealtimeHandler = realtime.NewHandler(c.RealtimeHub)

	// Re-create VideoSessionService with the actual RealtimePublisher now available.
	c.VideoSessionService = service.NewVideoSessionService(c.VideoSessionRepo, c.AssignmentRepo, c.ChatService, c.RealtimePublisher)
	c.VideoSessionHandler = handler.NewVideoSessionHandler(c.VideoSessionService)

	c.WSChatHandler = ws.NewHandler(c.Hub, c.ChatService, c.RealtimePublisher, c.ChatService, c.NotificationService, c.UserService)

	if cldClient, err := config.NewCloudinaryClient(); err != nil {
		println("[WARN] Cloudinary not configured:", err.Error())
		c.UserHandler = handler.NewUserHandler(c.UserService, nil)
	} else {
		c.CloudinaryService = service.NewCloudinaryService(cldClient)
		c.UserHandler = handler.NewUserHandler(c.UserService, c.CloudinaryService)
	}

	return c
}
