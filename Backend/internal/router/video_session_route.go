package router

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	userDomain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// RegisterVideoSessionRoutes registers all video session endpoints.
// IMPORTANT: /video-sessions/active must be registered BEFORE /video-sessions/:id
// to prevent Gin from treating "active" as a path parameter.
func RegisterVideoSessionRoutes(r *gin.Engine, c *container.MainServerContainer) {
	group := r.Group("/video-sessions")
	group.Use(middleware.JWTAuthMiddleware(c.JWTManager))
	{
		// Doctor creates a session.
		group.POST("",
			middleware.RequireRoles(userDomain.RoleDoctor),
			c.VideoSessionHandler.CreateVideoSession,
		)

		// GET /video-sessions/active — must come BEFORE /:id to avoid param collision.
		group.GET("/active",
			middleware.RequireRoles(userDomain.RoleDoctor, userDomain.RolePatient),
			c.VideoSessionHandler.GetActiveVideoSession,
		)

		// GET /video-sessions/:id
		group.GET("/:id",
			middleware.RequireRoles(userDomain.RoleDoctor, userDomain.RolePatient),
			c.VideoSessionHandler.GetVideoSession,
		)

		// POST /video-sessions/:id/join — returns joinUrl to authorized participants only.
		group.POST("/:id/join",
			middleware.RequireRoles(userDomain.RoleDoctor, userDomain.RolePatient),
			c.VideoSessionHandler.JoinVideoSession,
		)

		// POST /video-sessions/:id/end
		group.POST("/:id/end",
			middleware.RequireRoles(userDomain.RoleDoctor, userDomain.RolePatient),
			c.VideoSessionHandler.EndVideoSession,
		)

		// POST /video-sessions/:id/reject
		group.POST("/:id/reject",
			middleware.RequireRoles(userDomain.RoleDoctor, userDomain.RolePatient),
			c.VideoSessionHandler.RejectVideoSession,
		)
	}
}
