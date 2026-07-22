package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(r *gin.Engine, c *container.MainServerContainer) {
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", c.AuthHandler.Register)
		authGroup.POST("/login", c.AuthHandler.Login)
		authGroup.GET("/me", middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo), c.AuthHandler.Me)
		authGroup.POST("/refresh", c.AuthHandler.Refresh)
		authGroup.POST("/logout", middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo), c.AuthHandler.Logout)
		authGroup.GET("/google/login", c.AuthHandler.HandleGoogleOAuth2Login)
		authGroup.GET("/google/callback", c.AuthHandler.HandleGoogleOAuth2Callback)
		authGroup.POST("/forgot-password", c.AuthHandler.ForgotPassword)
		authGroup.POST("/verify-reset-otp", c.AuthHandler.VerifyResetOTP)
		authGroup.POST("/reset-password", c.AuthHandler.ResetPassword)
	}
}
