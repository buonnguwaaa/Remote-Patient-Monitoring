package handler

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/dto"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service       service.UserService
	cloudinarySvc service.CloudinaryService
}

func NewUserHandler(userService service.UserService, cloudinarySvc service.CloudinaryService) *UserHandler {
	return &UserHandler{
		service:       userService,
		cloudinarySvc: cloudinarySvc,
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
// @Param gender query string false "Filter by users' gender"
// @Param page query int false "Page number, default 1"
// @Param limit query int false "Number of items per page, default 10"
// @Param sortOrder query string false "Sort order, asc or desc, default asc"
// @Success 200 {object} map[string]interface{} "List of users retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users [get]
func (h *UserHandler) GetUsers(c *gin.Context) {
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

	input := &usecase.GetUsersInput{
		Name:      c.Query("name"),
		Email:     c.Query("email"),
		Gender:    c.Query("gender"),
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: sortOrder,
	}

	users, err := h.service.GetBaseUsers(ctx, input)
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

	u, err := h.service.GetBaseUserByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": u, "message": "user retrieved successfully"})
}

// UpdateUser updates a base user
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateUserInput{
		ID:     id,
		Name:   req.Name,
		Email:  req.Email,
		Gender: req.Gender,
		Phone:  req.Phone,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.UpdateBaseUser(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
}

// DeleteUser deletes a base user
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	input := &usecase.DeleteUserInput{
		ID: id,
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.DeleteBaseUser(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *UserHandler) UploadAvatar(c *gin.Context) {
	userID := c.Param("id")

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng chọn file ảnh: " + err.Error()})
		return
	}

	if fileHeader.Header.Get("Content-Type") != "" {
		contentType := fileHeader.Header.Get("Content-Type")
		if len(contentType) < 5 || contentType[:6] != "image/" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Chỉ chấp nhận file ảnh"})
			return
		}
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể mở file: " + err.Error()})
		return
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	oldAvatarURL := ""
	if currentUser, err := h.service.GetBaseUserByID(ctx, userID); err == nil {
		oldAvatarURL = currentUser.AvatarUrl
	}

	avatarUrl, err := h.cloudinarySvc.UploadAvatar(ctx, file, "rpm/avatars")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload thất bại: " + err.Error()})
		return
	}

	if err := h.service.UpdateBaseUser(ctx, &usecase.UpdateUserInput{
		ID:        userID,
		AvatarUrl: avatarUrl,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lưu avatar thất bại: " + err.Error()})
		return
	}

	if oldAvatarURL != "" {
		oldPublicID := service.ExtractPublicID(oldAvatarURL)
		if oldPublicID != "" {
			go func() {
				deleteCtx, deleteCancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer deleteCancel()
				if err := h.cloudinarySvc.DeleteAsset(deleteCtx, oldPublicID); err != nil {
					log.Printf("[Cloudinary] Không thể xóa ảnh cũ %s: %v", oldPublicID, err)
				} else {
					log.Printf("[Cloudinary] Đã xóa ảnh cũ: %s", oldPublicID)
				}
			}()
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"avatarUrl": avatarUrl,
		"message":   "Upload avatar thành công",
	})
}

// GetPatients retrieves a list of patients
func (h *UserHandler) GetPatients(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.GetUsersInput{
		Name:      c.Query("name"),
		Email:     c.Query("email"),
		Gender:    c.Query("gender"),
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: c.DefaultQuery("sortOrder", "asc"),
	}

	patients, err := h.service.GetPatients(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": patients, "message": "list of patients retrieved successfully"})
}

// GetPatientByID retrieves a patient by ID
func (h *UserHandler) GetPatientByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	patient, err := h.service.GetPatientByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": patient, "message": "patient retrieved successfully"})
}

// UpdatePatient updates a patient
func (h *UserHandler) UpdatePatient(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateUserInput{
		ID:     id,
		Name:   req.Name,
		Email:  req.Email,
		Gender: req.Gender,
		Phone:  req.Phone,
	}

	if err := h.service.UpdatePatient(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Patient updated successfully"})
}

// GetDoctors retrieves a list of doctors
func (h *UserHandler) GetDoctors(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.GetUsersInput{
		Name:      c.Query("name"),
		Email:     c.Query("email"),
		Gender:    c.Query("gender"),
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: c.DefaultQuery("sortOrder", "asc"),
	}

	doctors, err := h.service.GetDoctors(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": doctors, "message": "list of doctors retrieved successfully"})
}

// GetDoctorByID retrieves a doctor by ID
func (h *UserHandler) GetDoctorByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	doctor, err := h.service.GetDoctorByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": doctor, "message": "doctor retrieved successfully"})
}

// UpdateDoctor updates a doctor
func (h *UserHandler) UpdateDoctor(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateUserInput{
		ID:                id,
		Name:              req.Name,
		Email:             req.Email,
		Gender:            req.Gender,
		Phone:             req.Phone,
		Specialization:    req.Specialization,
		LicenseNumber:     req.LicenseNumber,
		Workplace:         req.Workplace,
		YearsOfExperience: req.YearsOfExperience,
	}

	if err := h.service.UpdateDoctor(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Doctor updated successfully"})
}

// GetNurses retrieves a list of nurses
func (h *UserHandler) GetNurses(c *gin.Context) {
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if err != nil || limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.GetUsersInput{
		Name:      c.Query("name"),
		Email:     c.Query("email"),
		Gender:    c.Query("gender"),
		Page:      page,
		Limit:     limit,
		Offset:    offset,
		SortOrder: c.DefaultQuery("sortOrder", "asc"),
	}

	nurses, err := h.service.GetNurses(ctx, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": nurses, "message": "list of nurses retrieved successfully"})
}

// GetNurseByID retrieves a nurse by ID
func (h *UserHandler) GetNurseByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	nurse, err := h.service.GetNurseByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": nurse, "message": "nurse retrieved successfully"})
}

// UpdateNurse updates a nurse
func (h *UserHandler) UpdateNurse(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateUserInput{
		ID:                     id,
		Name:                   req.Name,
		Email:                  req.Email,
		Gender:                 req.Gender,
		Phone:                  req.Phone,
		NurseLicenseNumber:     req.NurseLicenseNumber,
		NurseDepartment:        req.Department,
		NurseYearsOfExperience: req.NurseYearsOfExperience,
	}

	if err := h.service.UpdateNurse(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nurse updated successfully"})
}
