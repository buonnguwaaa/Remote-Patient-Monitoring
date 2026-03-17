package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAssignmentRoutes(r *gin.Engine, c *container.MainServerContainer) {
	assignGroup := r.Group("/assignments")
	assignGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		// Admin assigns doctor/nurse to patient
		assignGroup.POST("/assign", middleware.RequireRoles(domain.RoleAdmin), c.AssignmentHandler.AssignPatient)

		// Doctor/Nurse sees their assigned patients (RESTful: GET /assignments with auth context)
		assignGroup.GET("", middleware.RequireRoles(domain.RoleDoctor, domain.RoleNurse), c.AssignmentHandler.GetMyAssignments)
	}
}
