package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterMedicationIntakeRoutes(r *gin.Engine, c *container.MainServerContainer) {
	intakeGroup := r.Group("/medication-intakes")
	intakeGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo))
	{
		intakeGroup.GET("/adherence", middleware.RequireRoles(domain.RolePatient, domain.RoleDoctor, domain.RoleNurse, domain.RoleAdmin), c.MedicationIntakeHandler.GetMedicationAdherence)
		intakeGroup.POST("", middleware.RequireRoles(domain.RolePatient), c.MedicationIntakeHandler.CreateMedicationIntake)
	}
}
