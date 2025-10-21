package routes

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes() (r *gin.Engine) {
	// Add your route registrations here
	RegisterUserRoutes(r)
	return r
}
