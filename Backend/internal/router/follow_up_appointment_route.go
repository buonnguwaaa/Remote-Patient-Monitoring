package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterFollowUpAppointmentRoutes(r *gin.Engine, c *container.MainServerContainer) {
	appointmentGroup := r.Group("/appointments")
	appointmentGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo))
	{
		appointmentGroup.GET("", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.FollowUpAppointmentHandler.GetFollowUpAppointments)
		appointmentGroup.GET("/me", middleware.RequireRoles(domain.RolePatient, domain.RoleDoctor), c.FollowUpAppointmentHandler.GetMyFollowUpAppointments)
		appointmentGroup.GET("/:id", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse, domain.RolePatient), c.FollowUpAppointmentHandler.GetFollowUpAppointmentByID)
		appointmentGroup.POST("", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.FollowUpAppointmentHandler.CreateFollowUpAppointment)
		appointmentGroup.PATCH("/:id", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.FollowUpAppointmentHandler.UpdateFollowUpAppointment)
		appointmentGroup.PATCH("/:id/status", middleware.RequireRoles(domain.RoleAdmin, domain.RoleDoctor, domain.RoleNurse), c.FollowUpAppointmentHandler.UpdateFollowUpAppointmentStatus)
	}
}
