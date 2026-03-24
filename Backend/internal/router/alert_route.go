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
		alertGroup.GET("/doctors/me", middleware.RequireRoles(domain.RoleDoctor), c.AlertHandler.GetDoctorAlerts)
		alertGroup.GET("/patients/me", middleware.RequireRoles(domain.RolePatient), c.AlertHandler.GetPatientAlerts)
		alertGroup.GET("/:id", c.AlertHandler.GetAlertByID)
		alertGroup.PATCH("/ack/:id", middleware.RequireRoles(domain.RoleDoctor), c.AlertHandler.UpdateAlertAcknowledgementByID)
	}
}
