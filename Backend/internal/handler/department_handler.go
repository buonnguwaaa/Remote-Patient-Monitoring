package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type DepartmentHandler struct {
	service service.DepartmentService
}

func NewDepartmentHandler(service service.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{
		service: service,
	}
}

// @Summary Create department
// @Tags departments
// @Accept json
// @Produce json
// @Param department body usecase.CreateDepartmentInput true "Department info"
// @Success 201 {object} map[string]interface{}
// @Router /departments [post]
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req dto.CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.CreateDepartmentInput{
		Name:        req.Name,
		Description: req.Description,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	res, err := h.service.Create(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": res})
}

// @Summary Get all departments
// @Tags departments
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /departments [get]
func (h *DepartmentHandler) GetDepartments(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	res, err := h.service.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}

// @Summary Get department members
// @Tags departments
// @Produce json
// @Router /departments/{id}/members [get]
func (h *DepartmentHandler) GetDepartmentMembers(c *gin.Context) {
	id := c.Param("id")
	input := &usecase.GetDepartmentMembersInput{DepartmentID: id}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	members, err := h.service.GetMembers(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": members})
}

// @Summary Add member to department
// @Tags departments
// @Accept json
// @Produce json
// @Router /departments/{id}/members [post]
func (h *DepartmentHandler) AddMemberToDepartment(c *gin.Context) {
	var req dto.AddDepartmentMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.AddDepartmentMemberInput{
		DepartmentID: c.Param("id"),
		UserID:       req.UserID,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.service.AddMember(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Thêm thành viên thành công"})
}

// @Summary Update department
// @Tags departments
// @Accept json
// @Produce json
// @Param id path string true "Department ID"
// @Param department body dto.UpdateDepartmentRequest true "Department info"
// @Success 200 {object} map[string]interface{}
// @Router /departments/{id} [put]
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	var req dto.UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateDepartmentInput{
		ID:          c.Param("id"),
		Name:        req.Name,
		Description: req.Description,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	res, err := h.service.Update(ctx, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": res})
}

// @Summary Delete department
// @Tags departments
// @Produce json
// @Param id path string true "Department ID"
// @Success 200 {object} map[string]interface{}
// @Router /departments/{id} [delete]
func (h *DepartmentHandler) DeleteDepartment(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.service.Delete(ctx, id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Xóa khoa thành công"})
}
