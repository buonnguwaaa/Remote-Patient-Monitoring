package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterNotificationTokenRoutes(r *gin.Engine, c *container.MainServerContainer) {
	notificationTokenGroup := r.Group("/notification-tokens")
	notificationTokenGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo))
	{
		notificationTokenGroup.POST("/register", c.NotificationTokenHandler.RegisterNotificationToken)
		notificationTokenGroup.POST("/deactivate", c.NotificationTokenHandler.DeactivateNotificationToken)
	}
}
