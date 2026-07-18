package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterDepartmentRoutes(r *gin.Engine, c *container.MainServerContainer) {
	deptGroup := r.Group("/departments")
	deptGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo))
	{
		// Only Admin can manage departments
		deptGroup.POST("", middleware.RequireRoles(domain.RoleAdmin), c.DepartmentHandler.CreateDepartment)
		deptGroup.PUT("/:id", middleware.RequireRoles(domain.RoleAdmin), c.DepartmentHandler.UpdateDepartment)
		deptGroup.DELETE("/:id", middleware.RequireRoles(domain.RoleAdmin), c.DepartmentHandler.DeleteDepartment)
		// Everyone (Admin, Doctor, Nurse) can list departments to pick one
		deptGroup.GET("", c.DepartmentHandler.GetDepartments)

		deptGroup.GET("/:id/members", c.DepartmentHandler.GetDepartmentMembers)
		deptGroup.POST("/:id/members", middleware.RequireRoles(domain.RoleAdmin), c.DepartmentHandler.AddMemberToDepartment)
	}
}
