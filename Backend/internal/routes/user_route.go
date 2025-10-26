package routes

import (
	userhandler "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/handlers/user"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	r.POST("/auth/register", userhandler.Register)                  // register user
	r.POST("/auth/login", userhandler.Login)                        // login user
	r.GET("/auth/status", middleware.JWTAuth(), userhandler.Status) // check login status
	r.POST("/auth/refresh", userhandler.RefreshToken)               // refresh token
}
