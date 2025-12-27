package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAssignmentRoutes(r *gin.Engine, c *container.MainServerContainer) {
	assignGroup := r.Group("/assignments")
	assignGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		// Admin assigns doctor/nurse to patient
		assignGroup.POST("/assign", middleware.RequireRoles(domain.RoleAdmin), c.AssignmentHandler.AssignPatient)
		
		// Doctor/Nurse sees their assigned patients
		assignGroup.GET("/my", middleware.RequireRoles(domain.RoleDoctor, domain.RoleNurse), c.AssignmentHandler.GetMyAssignments)
	}
}
