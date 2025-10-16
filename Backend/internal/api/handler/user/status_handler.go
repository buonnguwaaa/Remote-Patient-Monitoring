package user

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

func Status(c *gin.Context) {
	claims, exists := c.Get("jwt_claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": claims})
}
