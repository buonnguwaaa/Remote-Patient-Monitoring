package user

import (
	"context"
	"net/http"
	"RPM-Backend/internal/api/model"
	"RPM-Backend/internal/service"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"github.com/gin-gonic/gin"
)

func Register(c *gin.Context) {
   var req struct {
	   Role    string `json:"role"`
	   Name    string `json:"name"`
	   Email   string `json:"email"`
	   Password string `json:"password"`
	   Gender  string `json:"gender"`
	   Age     int    `json:"age"`
   }
   if err := c.ShouldBindJSON(&req); err != nil {
	   c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
	   return
   }
   ctx := context.Background()
   user := &model.User{
	   ID:       primitive.NewObjectID(),
	   Role:     req.Role,
	   Name:     req.Name,
	   Email:    req.Email,
	   Password: req.Password,
	   Gender:   req.Gender,
	   Age:      req.Age,
   }
   err := service.RegisterUser(ctx, user)
   if err != nil {
	   c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
	   return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Register successful"})
}
