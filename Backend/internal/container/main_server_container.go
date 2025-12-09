package container

import (
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handler"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
)

// Container holds all the dependencies
type MainServerContainer struct {
	// Repositories
	UserRepo        repository.UserRepository
	TokenRepo       repository.TokenRepository
	MeasurementRepo repository.MeasurementRepository
	ThresholdRepo   repository.ThresholdRepository
	AlertRepo       repository.AlertRepository

	// Services
	AuthService        service.AuthService
	UserService        service.UserService
	MeasurementService service.MeasurementService
	ThresholdService   service.ThresholdService
	AlertService       service.AlertService

	// Handlers
	AuthHandler        *handler.AuthHandler
	UserHandler        *handler.UserHandler
	MeasurementHandler *handler.MeasurementHandler
	ThresholdHandler   *handler.ThresholdHandler
	AlertHandler       *handler.AlertHandler

	// Utils
	JWTManager *util.JWTManager
}

// NewMainServerContainer initializes all dependencies once
func NewMainServerContainer() *MainServerContainer {
	c := &MainServerContainer{}

	// Initialize utils
	jwtSecret := os.Getenv("JWT_SECRET")
	c.JWTManager = util.NewJWTManager(jwtSecret)

	// Initialize repositories
	db := config.Mongo.Database
	c.UserRepo = repository.NewUserRepository(db)
	c.TokenRepo = repository.NewTokenRepository(db)
	c.MeasurementRepo = repository.NewMeasurementRepository(db)
	c.ThresholdRepo = repository.NewThresholdRepository(db)
	c.AlertRepo = repository.NewAlertRepository(db)

	// Initialize services
	c.AuthService = service.NewAuthService(c.UserRepo, c.TokenRepo, c.JWTManager)
	c.UserService = service.NewUserService(c.UserRepo)
	c.MeasurementService = service.NewMeasurementService(c.UserRepo, c.MeasurementRepo)
	c.ThresholdService = service.NewThresholdService(c.UserRepo, c.ThresholdRepo)
	c.AlertService = service.NewAlertService(c.AlertRepo)

	// Initialize handlers
	c.AuthHandler = handler.NewAuthHandler(c.AuthService)
	c.UserHandler = handler.NewUserHandler(c.UserService)
	c.MeasurementHandler = handler.NewMeasurementHandler(c.MeasurementService)
	c.ThresholdHandler = handler.NewThresholdHandler(c.ThresholdService)
	c.AlertHandler = handler.NewAlertHandler(c.AlertService)
	return c
}
