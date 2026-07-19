package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterActivityLogRoutes(r *gin.Engine, c *container.MainServerContainer) {
	activityLogGroup := r.Group("/activity-logs")
	activityLogGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo))
	{
		// Admin: full raw activity log browser (append-only, no DELETE).
		activityLogGroup.GET("",
			middleware.RequireRoles(domain.RoleAdmin),
			c.ActivityLogHandler.GetActivityLogs,
		)
		activityLogGroup.GET("/stats",
			middleware.RequireRoles(domain.RoleAdmin),
			c.ActivityLogHandler.GetActivityLogStats,
		)

		// Doctor/nurse: clinical history for an assigned patient chart
		// (includes everyone's actions on that chart, including their own).
		activityLogGroup.GET("/clinical",
			middleware.RequireRoles(domain.RoleDoctor, domain.RoleNurse),
			c.ActivityLogHandler.GetClinicalHistory,
		)

		// Patient: who updated my chart.
		// Doctor/nurse: my own clinical write actions (across patients).
		activityLogGroup.GET("/me",
			middleware.RequireRoles(domain.RolePatient, domain.RoleDoctor, domain.RoleNurse),
			c.ActivityLogHandler.GetMyAccountActivity,
		)
	}
}
