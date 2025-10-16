package router

import (
	"github.com/gin-gonic/gin"
	userhandler "RPM-Backend/internal/api/handler/user"
	"RPM-Backend/internal/api/middleware"
)

func SetupRouter() *gin.Engine {
	router := gin.Default()

	router.GET("/ping", func(c *gin.Context) { // check server
		c.JSON(200, gin.H{"message": "pong"})
	})

		router.POST("/auth/register", userhandler.Register) // register user
		router.POST("/auth/login", userhandler.Login)       // login user
		router.GET("/auth/status", middleware.JWTAuth(), userhandler.Status) // check login status
		router.POST("/auth/refresh", userhandler.RefreshToken) // refresh token

	return router
}
