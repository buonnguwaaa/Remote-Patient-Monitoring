package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterThresholdRoutes(r *gin.Engine, c *container.MainServerContainer) {
	thresholdGroup := r.Group("/thresholds")
	thresholdGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		thresholdGroup.GET("", middleware.RequireRoles(domain.RoleDoctor), c.ThresholdHandler.GetThresholds)
		thresholdGroup.POST("", middleware.RequireRoles(domain.RoleDoctor), c.ThresholdHandler.CreateThreshold)
		thresholdGroup.PATCH("/:id", middleware.RequireRoles(domain.RoleDoctor), c.ThresholdHandler.UpdateThreshold)
		thresholdGroup.DELETE("/:id", middleware.RequireRoles(domain.RoleDoctor), c.ThresholdHandler.DeleteThreshold)
	}
}
