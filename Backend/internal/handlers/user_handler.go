package handlers

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/services"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecases"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service services.UserService
}

func NewUserHandler(service services.UserService) *UserHandler {
	return &UserHandler{
		service: service,
	}
}

// GetUsers retrieves a list of users
// @Summary Get list of users
// @Description Get a list of users with optional filters and pagination
// @Tags users
// @Accept json
// @Produce json
// @Param name query string false "Filter by users' name"
// @Param email query string false "Filter by users' email"
// @Param role query string false "Filter by users' roles, comma-separated (e.g., admin,user)"
// @Param gender query string false "Filter by users' gender"
// @Param page query int false "Page number, default 1"
// @Param limit query int false "Number of items per page, default 10"
// @Param sortOrder query string false "Sort order, asc or desc, default asc"
// @Success 200 {object} map[string]interface{} "List of users retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users [get]
func (h *UserHandler) GetUsers(c *gin.Context) {
	roles := []string{}
	if roleParam := c.Query("role"); roleParam != "" {
		roles = strings.Split(roleParam, ",")
	}
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit
	sortOrder := c.DefaultQuery("sortOrder", "asc")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	filter := &usecases.UserFilter{
		Name:      c.Query("name"),
		Email:     c.Query("email"),
		Role:      roles,
		Gender:    c.Query("gender"),
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: sortOrder,
	}
	input := &usecases.GetUsersInput{
		Filter: *filter,
	}

	users, err := h.service.GetUsers(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users, "message": "list of users retrieved successfully"})
}

// GetUserByID retrieves a user by ID
// @Summary Get user by ID
// @Description Get a user by their ID
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]interface{} "User retrieved successfully"
// @Failure 404 {object} map[string]string "User not found"
// @Router /users/{id} [get]
func (h *UserHandler) GetUserByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.service.GetUserByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": u, "message": "user retrieved successfully"})
}
