package user

import (
	"context"
	"net/http"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	ctx := context.Background()
	accessToken, refreshToken, user, err := services.LoginUser(ctx, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email or password incorrect"})
		return
	}

	resp := dto.LoginResponse{
		Tokens: dto.AuthTokens{AccessToken: accessToken, RefreshToken: refreshToken},
		User:   dto.ToUserResponse(*user),
	}
	c.JSON(http.StatusOK, resp)
}
