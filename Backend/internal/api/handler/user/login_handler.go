package user

import (
	"context"
	"net/http"
	"RPM-Backend/internal/service"
	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	   var req struct {
		   Email    string `json:"email"`
		   Password string `json:"password"`
	   }
	   if err := c.ShouldBindJSON(&req); err != nil {
		   c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		   return
	   }
	   ctx := context.Background()
		accessToken, refreshToken, user, err := service.LoginUser(ctx, req.Email, req.Password)
	   if err != nil {
		   c.JSON(http.StatusUnauthorized, gin.H{"error": "Email or password incorrect"})
		   return
	   }
	   c.JSON(http.StatusOK, gin.H{
		   "access_token": accessToken,
		   "refresh_token": refreshToken,
		   "user": gin.H{
			   "id": user.ID.Hex(),
			   "role": user.Role,
			   "name": user.Name,
			   "email": user.Email,
			   "gender": user.Gender,
			   "age": user.Age,
		   },
	   })
}
