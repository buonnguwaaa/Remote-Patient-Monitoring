package routes

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handlers"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middlewares"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/utils"
	"github.com/gin-gonic/gin"
	"os"
)

func RegisterUserRoutes(r *gin.Engine) {
	userRepo := repositories.NewUserRepository(config.Mongo.Database)
	userService := services.NewUserService(userRepo)
	userHandler := handlers.NewUserHandler(userService)

	jwtSecret := os.Getenv("JWT_SECRET")
	jwtManager := utils.NewJWTManager(jwtSecret)

	userGroup := r.Group("/users")
	{
		// Example public route or to be removed later
		userGroup.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "List of users"})
		})
		userGroup.GET("/:id", middlewares.JWTAuthMiddleware(jwtManager), userHandler.GetUserByID)
	}
}
