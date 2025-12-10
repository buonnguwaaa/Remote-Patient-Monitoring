package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine, c *container.MainServerContainer) {
	userGroup := r.Group("/users")
	{
		userGroup.GET("",
			middleware.JWTAuthMiddleware(c.JWTManager),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UserHandler.GetUsers,
		)
		userGroup.GET("/:id",
			middleware.JWTAuthMiddleware(c.JWTManager),
			c.UserHandler.GetUserByID,
		)
	}
}
