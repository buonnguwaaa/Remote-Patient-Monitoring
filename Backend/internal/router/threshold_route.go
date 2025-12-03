package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterThresholdRoutes(r *gin.Engine, c *container.Container) {
	thresholdGroup := r.Group("/thresholds")
	thresholdGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		thresholdGroup.GET("", c.ThresholdHandler.GetThresholds)
		thresholdGroup.POST("", c.ThresholdHandler.CreateThreshold)
		thresholdGroup.PATCH("/:id", c.ThresholdHandler.UpdateThreshold)
	}
}
