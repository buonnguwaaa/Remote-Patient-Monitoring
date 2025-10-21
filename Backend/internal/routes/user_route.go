package routes

import (
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	// Init handler ở đây
	// e.g: userHandler := handlers.NewUserHandler()
	// Add your user route registrations here
	userGroup := r.Group("/users")
	{
		// Sau có API thì thay thế đoạn func() bằng handler tương ứng
		userGroup.GET("/", func(c *gin.Context) {
			// Handle GET /users
			c.JSON(200, gin.H{"message": "List of users"})
		})
	}
}
