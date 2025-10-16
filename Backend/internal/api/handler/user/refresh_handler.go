package user

import (
	"context"
	"net/http"
	"RPM-Backend/internal/service"
	"github.com/gin-gonic/gin"
)

func RefreshToken(c *gin.Context) {
	   var req struct {
		   RefreshToken string `json:"refresh_token"`
	   }
	   if err := c.ShouldBindJSON(&req); err != nil {
		   c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		   return
	   }
	   ctx := context.Background()
	   result := service.HandleRefreshToken(ctx, req.RefreshToken)
	   if result.Err != nil {
		   c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		   return
	   }
	   c.JSON(http.StatusOK, gin.H{
		   "access_token": result.AccessToken,
	   })
}
