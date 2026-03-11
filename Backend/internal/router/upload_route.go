package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterUploadRoutes(r *gin.Engine, c *container.MainServerContainer) {
	uploadGroup := r.Group("/upload")
	{
		// POST /upload/users/:id/avatar — upload + lưu URL vào user
		uploadGroup.POST("/users/:id/avatar",
			middleware.JWTAuthMiddleware(c.JWTManager),
			middleware.RequireRoles(domain.RoleAdmin),
			c.UploadHandler.UploadAvatar,
		)
	}
}
