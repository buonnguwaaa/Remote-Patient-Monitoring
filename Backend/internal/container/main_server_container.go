package container

import (
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handler"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	chatRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/chat"
	userRepository "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	ws "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/ws"
)

// Container holds all the dependencies
type MainServerContainer struct {
	// Repositories
	BaseUserRepo     userRepository.BaseUserRepository
	PatientRepo      userRepository.PatientRepository
	DoctorRepo       userRepository.StaffRepository[domain.Doctor]
	NurseRepo        userRepository.StaffRepository[domain.Nurse]
	TokenRepo        repository.TokenRepository
	MeasurementRepo  repository.MeasurementRepository
	ThresholdRepo    repository.ThresholdRepository
	AlertRepo        repository.AlertRepository
	DepartmentRepo   repository.DepartmentRepository
	AssignmentRepo   repository.AssignmentRepository
	ReminderRepo     repository.ReminderRepository
	ConversationRepo chatRepository.ConversationRepository
	MessageRepo      chatRepository.MessageRepository

	// Services
	AuthService        service.AuthService
	UserService        service.UserService
	MeasurementService service.MeasurementService
	ThresholdService   service.ThresholdService
	AlertService       service.AlertService
	DepartmentService  service.DepartmentService
	AssignmentService  service.AssignmentService
	ReminderService    service.ReminderService
	ChatService        service.ChatService

	// Handlers
	AuthHandler        *handler.AuthHandler
	UserHandler        *handler.UserHandler
	MeasurementHandler *handler.MeasurementHandler
	ThresholdHandler   *handler.ThresholdHandler
	AlertHandler       *handler.AlertHandler
	DepartmentHandler  *handler.DepartmentHandler
	AssignmentHandler  *handler.AssignmentHandler
	ReminderHandler    *handler.ReminderHandler
	ChatHandler        *handler.ChatHandler

	// WebSocket
	WSChatHandler *ws.Handler
	Hub           *ws.Hub

	// Utils
	JWTManager *util.JWTManager

	CloudinaryService service.CloudinaryService
}

// NewMainServerContainer initializes all dependencies once
func NewMainServerContainer() *MainServerContainer {
	c := &MainServerContainer{}

	// Initialize utils
	jwtSecret := os.Getenv("JWT_SECRET")
	c.JWTManager = util.NewJWTManager(jwtSecret)

	// Initialize repositories
	db := config.Mongo.Database
	c.BaseUserRepo = userRepository.NewBaseUserRepository(db)
	c.PatientRepo = userRepository.NewPatientRepository(db)
	c.DoctorRepo = userRepository.NewStaffRepository[domain.Doctor](db)
	c.NurseRepo = userRepository.NewStaffRepository[domain.Nurse](db)

	c.TokenRepo = repository.NewTokenRepository(db)
	c.MeasurementRepo = repository.NewMeasurementRepository(db)
	c.ThresholdRepo = repository.NewThresholdRepository(db)
	c.AlertRepo = repository.NewAlertRepository(db)
	c.DepartmentRepo = repository.NewDepartmentRepository(db)
	c.AssignmentRepo = repository.NewAssignmentRepository(db)
	c.ReminderRepo = repository.NewReminderRepository(db)
	c.ConversationRepo = chatRepository.NewConversationRepository(db)
	c.MessageRepo = chatRepository.NewMessageRepository(db)

	// Initialize services
	c.AuthService = service.NewAuthService(c.BaseUserRepo, c.PatientRepo, c.DoctorRepo, c.NurseRepo, c.TokenRepo, c.JWTManager)
	c.UserService = service.NewUserService(c.BaseUserRepo, c.PatientRepo, c.NurseRepo, c.DoctorRepo)
	c.MeasurementService = service.NewMeasurementService(c.PatientRepo, c.MeasurementRepo)
	c.ThresholdService = service.NewThresholdService(c.PatientRepo, c.DoctorRepo, c.ThresholdRepo)
	c.AlertService = service.NewAlertService(c.AlertRepo)
	c.DepartmentService = service.NewDepartmentService(c.DepartmentRepo, c.DoctorRepo, c.NurseRepo)
	c.AssignmentService = service.NewAssignmentService(c.AssignmentRepo, c.BaseUserRepo)
	c.ReminderService = service.NewReminderService(c.PatientRepo, c.ReminderRepo)
	c.ChatService = service.NewChatService(c.ConversationRepo, c.MessageRepo, c.AssignmentRepo)

	// Initialize handlers
	c.AuthHandler = handler.NewAuthHandler(c.AuthService)
	c.MeasurementHandler = handler.NewMeasurementHandler(c.MeasurementService)
	c.ThresholdHandler = handler.NewThresholdHandler(c.ThresholdService)
	c.AlertHandler = handler.NewAlertHandler(c.AlertService)
	c.DepartmentHandler = handler.NewDepartmentHandler(c.DepartmentService)
	c.AssignmentHandler = handler.NewAssignmentHandler(c.AssignmentService)
	c.ReminderHandler = handler.NewReminderHandler(c.ReminderService)
	c.ChatHandler = handler.NewChatHandler(c.ChatService)

	// Initialize WebSocket
	c.Hub = ws.NewHub()
	go c.Hub.Run()
	c.WSChatHandler = ws.NewHandler(c.Hub, c.ChatService)

	// Cloudinary — log warning nếu chưa cấu hình
	if cldClient, err := config.NewCloudinaryClient(); err != nil {
		println("[WARN] Cloudinary not configured:", err.Error())
		c.UserHandler = handler.NewUserHandler(c.UserService, nil)
	} else {
		c.CloudinaryService = service.NewCloudinaryService(cldClient)
		c.UserHandler = handler.NewUserHandler(c.UserService, c.CloudinaryService)
	}

	return c
}
