package router

import (
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handler"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(r *gin.Engine) {
	jwtSecret := os.Getenv("JWT_SECRET")
	userRepo := repository.NewUserRepository(config.Mongo.Database)
	tokenRepo := repository.NewTokenRepository(config.Mongo.Database)
	jwtManager := util.NewJWTManager(jwtSecret)
	authService := service.NewAuthService(userRepo, tokenRepo, jwtManager)
	authHandler := handler.NewAuthHandler(authService)

	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.GET("/me", middleware.JWTAuthMiddleware(jwtManager), authHandler.Me)
		authGroup.POST("/refresh", authHandler.Refresh)
		authGroup.POST("/logout", authHandler.Logout)
		authGroup.GET("/google/login", authHandler.HandleGoogleOAuth2Login)
		authGroup.GET("/google/callback", authHandler.HandleGoogleOAuth2Callback)

		authGroup.POST("/forgot-password", authHandler.ForgotPassword)
		authGroup.POST("/reset-password", authHandler.ResetPassword)
		authGroup.POST("/activate", authHandler.ActivateAccount)
		authGroup.POST("/resend-activation", authHandler.ResendActivationEmail)
	}
}
