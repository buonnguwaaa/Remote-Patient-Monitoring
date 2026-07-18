package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterRealtimeRoutes(r *gin.Engine, c *container.MainServerContainer) {
	realtimeGroup := r.Group("/realtime")
	realtimeGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager, c.TokenBlacklistRepo))
	{
		realtimeGroup.GET("/ws", middleware.RequireRoles(domain.RoleDoctor), c.RealtimeHandler.ServeWs)
	}
}
