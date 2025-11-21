package router

import (
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handlers"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repository"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/util"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	userRepo := repository.NewUserRepository(config.Mongo.Database)
	userService := service.NewUserService(userRepo)
	userHandler := handlers.NewUserHandler(userService)

	jwtSecret := os.Getenv("JWT_SECRET")
	jwtManager := util.NewJWTManager(jwtSecret)

	userGroup := r.Group("/users")
	{
		userGroup.GET("", middleware.JWTAuthMiddleware(jwtManager), middleware.RequireRoles(domain.RoleAdmin), userHandler.GetUsers)
		userGroup.GET("/:id", middleware.JWTAuthMiddleware(jwtManager), userHandler.GetUserByID)
	}
}
