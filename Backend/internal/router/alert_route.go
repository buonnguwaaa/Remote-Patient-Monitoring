package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAlertRoutes(r *gin.Engine, c *container.MainServerContainer) {
	alertGroup := r.Group("/alerts")
	alertGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		alertGroup.GET("", c.AlertHandler.GetAlerts)
		alertGroup.PATCH("/:id", middleware.RequireRoles(domain.RoleDoctor), c.AlertHandler.UpdateAlertAcknowledgementByID)
	}
}
