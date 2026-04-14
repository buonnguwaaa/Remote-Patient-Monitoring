package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterNotificationRoutes(r *gin.Engine, c *container.MainServerContainer) {
	notificationGroup := r.Group("/notifications")
	notificationGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		notificationGroup.GET("", c.NotificationHandler.GetMyNotifications)
		notificationGroup.GET("/unread-count", c.NotificationHandler.GetUnreadNotificationCount)
		notificationGroup.PATCH("/:id/read", c.NotificationHandler.MarkNotificationRead)
	}
}
