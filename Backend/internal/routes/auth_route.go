package routes

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handlers"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"github.com/gin-gonic/gin"
	"os"
	"time"
)

func RegisterAuthRoutes(r *gin.Engine) {
	jwtSecret := os.Getenv("JWT_SECRET")
	userRepo := repositories.NewUserRepository(config.Mongo.Database)
	jwtManager := utils.NewJWTManager(jwtSecret, 24*time.Hour)
	authService := services.NewAuthService(userRepo, jwtManager)
	authHandler := handlers.NewAuthHandler(authService)

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
	}
}
