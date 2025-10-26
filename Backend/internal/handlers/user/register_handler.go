package user

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domains/users"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func Register(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Parse DOB
	dob, err := time.Parse("2006-01-02", req.Dob)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid dob format, expected YYYY-MM-DD"})
		return
	}

	ctx := context.Background()
	user := &users.User{
		ID:        primitive.NewObjectID(),
		Role:      req.Role,
		Name:      req.Name,
		Email:     req.Email,
		Password:  req.Password,
		Gender:    req.Gender,
		Dob:       dob,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := services.RegisterUser(ctx, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Register successful"})
}
