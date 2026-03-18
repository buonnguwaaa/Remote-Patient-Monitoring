package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterReminderRoutes(r *gin.Engine, c *container.MainServerContainer) {
	reminderGroup := r.Group("/reminders")
	reminderGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		reminderGroup.GET("", c.ReminderHandler.GetReminders)
		reminderGroup.POST("", middleware.RequireRoles(domain.RoleDoctor), c.ReminderHandler.CreateReminder)
		reminderGroup.PATCH("/:id", middleware.RequireRoles(domain.RoleDoctor), c.ReminderHandler.UpdateReminderByID)
		reminderGroup.PATCH("/:id/status", middleware.RequireRoles(domain.RoleDoctor), c.ReminderHandler.UpdateReminderStatus)
	}
}
