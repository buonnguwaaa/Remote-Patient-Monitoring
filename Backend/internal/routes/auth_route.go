package routes

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handlers"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"github.com/gin-gonic/gin"
	"os"
)

func RegisterAuthRoutes(r *gin.Engine) {
	jwtSecret := os.Getenv("JWT_SECRET")
	userRepo := repositories.NewUserRepository(config.Mongo.Database)
	tokenRepo := repositories.NewTokenRepository(config.Mongo.Database)
	jwtManager := utils.NewJWTManager(jwtSecret)
	authService := services.NewAuthService(userRepo, tokenRepo, jwtManager)
	authHandler := handlers.NewAuthHandler(authService)

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/refresh", authHandler.Refresh)
		authGroup.POST("/logout", authHandler.Logout)
		authGroup.GET("/google/login", authHandler.HandleGoogleOAuth2Login)
		authGroup.GET("/google/callback", authHandler.HandleGoogleOAuth2Callback)

		authGroup.POST("/forgot-password", authHandler.ForgotPassword)
		authGroup.POST("/reset-password", authHandler.ResetPassword)
		authGroup.GET("/activate/:email", authHandler.ActivateAccount)
	}
}

