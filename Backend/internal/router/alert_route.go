package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAlertRoutes(r *gin.Engine, c *container.MainServerContainer) {
	alertGroup := r.Group("/alerts")
	alertGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		alertGroup.GET("", c.AlertHandler.GetAlerts)
		alertGroup.PATCH("/:id", middleware.RequireRoles(domain.RoleDoctor), c.AlertHandler.UpdateAlertAcknowledgementByID)
		alertGroup.PATCH("/:id/acknowledge", middleware.RequireRoles(domain.RoleDoctor), c.AlertHandler.UpdateAlertAcknowledgementByID)
	}
}
