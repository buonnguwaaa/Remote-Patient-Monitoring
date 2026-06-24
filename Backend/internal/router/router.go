package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func RegisterRoutes(r *gin.Engine, c *container.MainServerContainer) {
	// Register all routes with container
	RegisterAuthRoutes(r, c)
	RegisterUserRoutes(r, c)
	RegisterMeasurementRoutes(r, c)
	RegisterThresholdRoutes(r, c)
	RegisterAlertRoutes(r, c)
	RegisterDepartmentRoutes(r, c)
	RegisterAssignmentRoutes(r, c)
	RegisterReminderRoutes(r, c)
	RegisterPrescriptionRoutes(r, c)
	RegisterMedicationIntakeRoutes(r, c)
	RegisterFollowUpAppointmentRoutes(r, c)
	RegisterChatRoutes(r, c)
	RegisterNotificationTokenRoutes(r, c)
	RegisterNotificationRoutes(r, c)
	RegisterRealtimeRoutes(r, c)
	RegisterActivityLogRoutes(r, c)
	RegisterVideoSessionRoutes(r, c)
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "OK",
		})
	})

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}
