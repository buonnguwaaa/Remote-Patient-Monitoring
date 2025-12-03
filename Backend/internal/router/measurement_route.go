package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterMeasurementRoutes(r *gin.Engine, c *container.Container) {
	measurementGroup := r.Group("/measurements")
	measurementGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		measurementGroup.GET("", c.MeasurementHandler.GetMeasurements)
		measurementGroup.POST("/", c.MeasurementHandler.CreateMeasurement)
		measurementGroup.PATCH("/:id", c.MeasurementHandler.UpdateMeasurement)
	}
}
