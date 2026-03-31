package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterChatRoutes(r *gin.Engine, c *container.MainServerContainer) {
	chatGroup := r.Group("/chat")
	chatGroup.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		chatGroup.GET("/ws", middleware.RequireRoles(domain.RoleDoctor, domain.RolePatient), c.WSChatHandler.ServeWs)
		chatGroup.GET("/conversations", middleware.RequireRoles(domain.RoleDoctor, domain.RolePatient), c.ChatHandler.GetConversations)
		chatGroup.POST("/conversations", middleware.RequireRoles(domain.RoleDoctor, domain.RolePatient), c.ChatHandler.CreateConversation)
		chatGroup.GET("/conversations/:id/messages", middleware.RequireRoles(domain.RoleDoctor, domain.RolePatient), c.ChatHandler.GetMessages)
	}
}
