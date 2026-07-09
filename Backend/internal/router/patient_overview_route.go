package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterPatientOverviewRoutes(r *gin.Engine, c *container.MainServerContainer) {
	grp := r.Group("/patient-overview")
	grp.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		grp.GET("/me", middleware.RequireRoles(domain.RoleDoctor, domain.RoleNurse), c.PatientOverviewHandler.GetMyPatientOverview)
	}
}
