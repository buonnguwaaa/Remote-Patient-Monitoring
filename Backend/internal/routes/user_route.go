package routes

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handlers"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	userRepo := repositories.NewUserRepository(config.Mongo.Database)
	userService := services.NewUserService(userRepo)
	userHandler := handlers.NewUserHandler(userService)

	userGroup := r.Group("/users")
	{
		// Sau có API thì thay thế đoạn func() bằng handler tương ứng
		userGroup.GET("/", func(c *gin.Context) {
			// Handle GET /users
			c.JSON(200, gin.H{"message": "List of users"})
		})
		userGroup.POST("/", userHandler.CreateUser)
		userGroup.GET("/:id", userHandler.GetUserByID)
	}
}
