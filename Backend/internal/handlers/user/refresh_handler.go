package user

import (
	"context"
	"net/http"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/gin-gonic/gin"
)

func RefreshToken(c *gin.Context) {
	var req dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	ctx := context.Background()
	result := services.HandleRefreshToken(ctx, req.RefreshToken)
	if result.Err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		return
	}
	c.JSON(http.StatusOK, dto.RefreshTokenResponse{AccessToken: result.AccessToken})
}
