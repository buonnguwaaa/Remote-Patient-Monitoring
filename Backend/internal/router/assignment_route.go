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
		assignGroup.POST("/assign", middleware.RequireRoles(domain.RoleAdmin), c.AssignmentHandler.AssignPatient)
		assignGroup.GET("/admin", middleware.RequireRoles(domain.RoleAdmin), c.AssignmentHandler.GetAllAssignments)
		assignGroup.DELETE("/:patientId", middleware.RequireRoles(domain.RoleAdmin), c.AssignmentHandler.DeleteAssignment)

		assignGroup.GET("", middleware.RequireRoles(domain.RoleDoctor, domain.RoleNurse), c.AssignmentHandler.GetMyAssignments)
	}
}
