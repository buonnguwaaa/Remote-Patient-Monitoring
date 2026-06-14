package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterPrescriptionRoutes(r *gin.Engine, c *container.MainServerContainer) {
	prescriptionGroup := r.Group("/prescriptions")
	prescriptionGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		prescriptionGroup.GET("", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.PrescriptionHandler.GetPrescriptions)
		prescriptionGroup.GET("/me", middleware.RequireRoles(domain.RolePatient), c.PrescriptionHandler.GetMyPrescriptions)
		prescriptionGroup.GET("/:id", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.PrescriptionHandler.GetPrescriptionByID)
		prescriptionGroup.POST("", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.PrescriptionHandler.CreatePrescription)
		prescriptionGroup.PATCH("/:id", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.PrescriptionHandler.UpdatePrescriptionByID)
		prescriptionGroup.PATCH("/:id/status", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.PrescriptionHandler.UpdatePrescriptionStatus)
	}
}
