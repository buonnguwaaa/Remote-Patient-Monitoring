package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterActivityLogRoutes(r *gin.Engine, c *container.MainServerContainer) {
	activityLogGroup := r.Group("/activity-logs")
	activityLogGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	activityLogGroup.Use(middleware.RequireRoles(domain.RoleAdmin))
	{
		activityLogGroup.GET("", c.ActivityLogHandler.GetActivityLogs)
		activityLogGroup.GET("/stats", c.ActivityLogHandler.GetActivityLogStats)
		activityLogGroup.DELETE("/cleanup-access", c.ActivityLogHandler.CleanupAccessLogs)
		activityLogGroup.DELETE("/:id", c.ActivityLogHandler.DeleteActivityLog)
	}
}
