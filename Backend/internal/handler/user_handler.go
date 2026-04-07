package handler

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	domain "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/domain/user"
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

// GetBaseUsers retrieves a list of base users
// @Summary Get list of base users
// @Description Get a list of base users with optional filters and pagination
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
func (h *UserHandler) GetBaseUsers(c *gin.Context) {
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
		Gender:    domain.Gender(c.Query("gender")),
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

	c.JSON(http.StatusOK, gin.H{"data": users, "message": "List of users retrieved successfully"})
}

// GetBaseUserByID retrieves a base user by ID
// @Summary Get base user by ID
// @Description Get a base user by their ID
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]interface{} "User retrieved successfully"
// @Failure 404 {object} map[string]string "User not found"
// @Router /users/{id} [get]
func (h *UserHandler) GetBaseUserByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	u, err := h.service.GetBaseUserByID(ctx, &usecase.GetUserByIDInput{ID: id})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": u, "message": "User retrieved successfully"})
}

// UpdateBaseUserByID updates a base user by ID
// @Summary Update base user by ID
// @Description Update a base user's information by their ID
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param body body dto.UpdateBaseUserRequest true "Updated user information"
// @Success 200 {object} map[string]interface{} "User updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/{id} [patch]
func (h *UserHandler) UpdateBaseUserByID(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateBaseUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := &usecase.UpdateUserInfoInput{
		ID:     id,
		Name:   req.Name,
		Email:  req.Email,
		Gender: domain.Gender(req.Gender),
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

// UpdateBaseUserStatusByID updates only a user's status by ID
// @Summary Update user status by ID
// @Description Update only a user's status by their ID (admin only)
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param body body dto.UpdateUserStatusRequest true "User status update payload"
// @Success 200 {object} map[string]interface{} "User status updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/{id}/status [patch]
func (h *UserHandler) UpdateBaseUserStatusByID(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	if err := h.service.UpdateBaseUserStatus(ctx, &usecase.UpdateUserStatusInput{ID: id, Status: domain.Status(req.Status)}); err != nil {
		if errors.Is(err, service.ErrInvalidUserStatus) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User status updated successfully"})
}

// DeleteBaseUserByID deletes a base user by ID
// @Summary Delete base user by ID
// @Description Delete a base user by their ID
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]interface{} "User deleted successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/{id} [delete]
func (h *UserHandler) DeleteBaseUserByID(c *gin.Context) {
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

// UploadAvatar handles avatar upload for a user
// @Summary Upload avatar for a user
// @Description Upload an avatar image for a user by their ID
// @Tags users
// @Accept multipart/form-data
// @Produce json
// @Param id path string true "User ID"
// @Param file formData file true "Avatar image file"
// @Success 200 {object} map[string]interface{} "Avatar uploaded successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/{id}/avatar [post]
func (h *UserHandler) UploadAvatar(c *gin.Context) {
	h.uploadAvatarForUser(c, c.Param("id"))
}

// UploadMyPatientAvatar handles avatar upload for the authenticated patient.
func (h *UserHandler) UploadMyPatientAvatar(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	h.uploadAvatarForUser(c, userID.(string))
}

func (h *UserHandler) uploadAvatarForUser(c *gin.Context, userID string) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vui lòng chọn file ảnh: " + err.Error()})
		return
	}

	if fileHeader.Header.Get("Content-Type") != "" {
		contentType := fileHeader.Header.Get("Content-Type")
		if len(contentType) < 6 || contentType[:6] != "image/" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Only image files are allowed"})
			return
		}
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cannot open file: " + err.Error()})
		return
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	oldAvatarURL := ""
	if currentUser, err := h.service.GetBaseUserByID(ctx, &usecase.GetUserByIDInput{ID: userID}); err == nil {
		oldAvatarURL = currentUser.AvatarUrl
	}

	avatarUrl, err := h.cloudinarySvc.UploadAvatar(ctx, file, "rpm/avatars")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed: " + err.Error()})
		return
	}

	if err := h.service.UpdateBaseUser(ctx, &usecase.UpdateUserInfoInput{ID: userID, AvatarUrl: avatarUrl}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save avatar: " + err.Error()})
		return
	}

	if oldAvatarURL != "" {
		oldPublicID := service.ExtractPublicID(oldAvatarURL)
		if oldPublicID != "" {
			go func() {
				deleteCtx, deleteCancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer deleteCancel()
				if err := h.cloudinarySvc.DeleteAsset(deleteCtx, oldPublicID); err != nil {
					log.Printf("[Cloudinary] Cannot delete old image %s: %v", oldPublicID, err)
				} else {
					log.Printf("[Cloudinary] Successfully deleted old image: %s", oldPublicID)
				}
			}()
		}
	}

	c.JSON(http.StatusOK, gin.H{"avatarUrl": avatarUrl, "message": "Avatar uploaded successfully"})
}

// GetMyPatientProfile retrieves the authenticated patient's profile
// @Summary Get my patient profile
// @Description Retrieve the full profile of the authenticated patient
// @Tags patients
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Patient profile retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Patient not found"
// @Router /users/patients/me [get]
func (h *UserHandler) GetMyPatientProfile(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	patient, err := h.service.GetPatientByID(ctx, &usecase.GetUserByIDInput{ID: userID.(string)})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": patient, "message": "Patient profile retrieved successfully"})
}

// UpdateMyPatientProfile updates the authenticated patient's profile
// @Summary Update my patient profile
// @Description Update editable profile information for the authenticated patient
// @Tags patients
// @Accept json
// @Produce json
// @Param input body dto.UpdateMyPatientProfileRequest true "Patient profile update data"
// @Success 200 {object} map[string]interface{} "Patient profile updated successfully"
// @Failure 400 {object} map[string]string "Invalid request data"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/patients/me [patch]
func (h *UserHandler) UpdateMyPatientProfile(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req dto.UpdateMyPatientProfileRawRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Email != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"field": "email",
			"error": "Email không được cập nhật trực tiếp ở màn hồ sơ. Vui lòng dùng luồng xác minh email riêng.",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.service.UpdatePatientProfile(ctx, &usecase.UpdatePatientProfileInput{
		ID:    userID.(string),
		Name:  req.Name,
		Phone: req.Phone,
		PatientProfileFieldsInput: usecase.PatientProfileFieldsInput{
			InsuranceNumber:       req.InsuranceNumber,
			CCCD:                  req.CCCD,
			EmergencyContactName:  req.EmergencyContactName,
			EmergencyContactPhone: req.EmergencyContactPhone,
			MedicalHistory:        req.MedicalHistory,
		},
	})
	if err != nil {
		var validationErr *service.ValidationError
		var conflictErr *service.ConflictError
		switch {
		case errors.As(err, &validationErr):
			c.JSON(http.StatusBadRequest, gin.H{"field": validationErr.Field, "error": validationErr.Message})
			return
		case errors.As(err, &conflictErr):
			c.JSON(http.StatusConflict, gin.H{"field": conflictErr.Field, "error": conflictErr.Message})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	patient, err := h.service.GetPatientByID(ctx, &usecase.GetUserByIDInput{ID: userID.(string)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": patient, "message": "Patient profile updated successfully"})
}

// GetPatients retrieves a list of patients
// @Summary Get list of patients
// @Description Get a list of patients with optional filters and pagination
// @Tags patients
// @Accept json
// @Produce json
// @Param name query string false "Filter by patients' name"
// @Param email query string false "Filter by patients' email"
// @Param gender query string false "Filter by patients' gender"
// @Param page query int false "Page number, default 1"
// @Param limit query int false "Number of items per page, default 10"
// @Param sortOrder query string false "Sort order, asc or desc, default asc"
// @Success 200 {object} map[string]interface{} "List of patients retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/patients [get]
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
		Gender:    domain.Gender(c.Query("gender")),
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
// @Summary Get patient by ID
// @Description Get a patient by their ID
// @Tags patients
// @Accept json
// @Produce json
// @Param id path string true "Patient ID"
// @Success 200 {object} map[string]interface{} "Patient retrieved successfully"
// @Failure 404 {object} map[string]string "Patient not found"
// @Router /users/patients/{id} [get]
func (h *UserHandler) GetPatientByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	patient, err := h.service.GetPatientByID(ctx, &usecase.GetUserByIDInput{ID: id})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": patient, "message": "patient retrieved successfully"})
}

// UpdatePatientByID updates a patient by ID
// @Summary Update patient
// @Description Update a patient's information
// @Tags patients
// @Accept json
// @Produce json
// @Param id path string true "Patient ID"
// @Param input body dto.UpdatePatientRequest true "Patient update data"
// @Success 200 {object} map[string]string "Patient updated successfully"
// @Failure 400 {object} map[string]string "Invalid request data"
// @Failure 404 {object} map[string]string "Patient not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/patients/{id} [patch]
func (h *UserHandler) UpdatePatientByID(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdatePatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateUserInfoInput{
		ID:     id,
		Name:   req.Name,
		Email:  req.Email,
		Gender: domain.Gender(req.Gender),
		Phone:  req.Phone,
		PatientProfileFieldsInput: usecase.PatientProfileFieldsInput{
			InsuranceNumber:       req.InsuranceNumber,
			CCCD:                  req.CCCD,
			EmergencyContactName:  req.EmergencyContactName,
			EmergencyContactPhone: req.EmergencyContactPhone,
			MedicalHistory:        req.MedicalHistory,
		},
	}

	if err := h.service.UpdatePatient(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Patient updated successfully"})
}

// GetDoctors retrieves a list of doctors
// @Summary Get list of doctors
// @Description Get a list of doctors with optional filters and pagination
// @Tags doctors
// @Accept json
// @Produce json
// @Param name query string false "Filter by doctors' name"
// @Param email query string false "Filter by doctors' email"
// @Param gender query string false "Filter by doctors' gender"
// @Param page query int false "Page number, default 1"
// @Param limit query int false "Number of items per page, default 10"
// @Param sortOrder query string false "Sort order, asc or desc, default asc"
// @Success 200 {object} map[string]interface{} "List of doctors retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/doctors [get]
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
		Gender:    domain.Gender(c.Query("gender")),
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
// @Summary Get doctor by ID
// @Description Retrieve a doctor's information by their ID
// @Tags doctors
// @Accept json
// @Produce json
// @Param id path string true "Doctor ID"
// @Success 200 {object} map[string]interface{} "Doctor retrieved successfully"
// @Failure 404 {object} map[string]string "Doctor not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/doctors/{id} [get]
func (h *UserHandler) GetDoctorByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	doctor, err := h.service.GetDoctorByID(ctx, &usecase.GetUserByIDInput{ID: id})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": doctor, "message": "doctor retrieved successfully"})
}

// UpdateDoctorByID updates a doctor by ID
// @Summary Update doctor by ID
// @Description Update a doctor's information by their ID
// @Tags doctors
// @Accept json
// @Produce json
// @Param id path string true "Doctor ID"
// @Param body body dto.UpdateDoctorRequest true "Updated doctor information"
// @Success 200 {object} map[string]interface{} "Doctor updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/doctors/{id} [patch]
func (h *UserHandler) UpdateDoctorByID(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateDoctorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateUserInfoInput{
		ID:     id,
		Name:   req.Name,
		Email:  req.Email,
		Gender: domain.Gender(req.Gender),
		Phone:  req.Phone,
		StaffFieldsInput: usecase.StaffFieldsInput{
			DepartmentID:  req.DepartmentID,
			LicenseNumber: req.LicenseNumber,
			Workplace:     req.Workplace,
		},
		DoctorFieldsInput: usecase.DoctorFieldsInput{
			Specialization:    req.Specialization,
			YearsOfExperience: req.YearsOfExperience,
		},
	}

	if err := h.service.UpdateDoctor(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Doctor updated successfully"})
}

// GetNurses retrieves a list of nurses
// @Summary Get list of nurses
// @Description Get a list of nurses with optional filters and pagination
// @Tags nurses
// @Accept json
// @Produce json
// @Param name query string false "Filter by nurses' name"
// @Param email query string false "Filter by nurses' email"
// @Param gender query string false "Filter by nurses' gender"
// @Param page query int false "Page number, default 1"
// @Param limit query int false "Number of items per page, default 10"
// @Param sortOrder query string false "Sort order, asc or desc, default asc"
// @Success 200 {object} map[string]interface{} "List of nurses retrieved successfully"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/nurses [get]
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
		Gender:    domain.Gender(c.Query("gender")),
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

// GetMyNurseProfile retrieves the authenticated nurse's profile
// @Summary Get my nurse profile
// @Description Retrieve the full profile of the authenticated nurse
// @Tags nurses
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "Nurse profile retrieved successfully"
// @Failure 401 {object} map[string]string "Unauthorized"
// @Failure 404 {object} map[string]string "Nurse not found"
// @Router /users/nurses/me [get]
func (h *UserHandler) GetMyNurseProfile(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	nurse, err := h.service.GetNurseByID(ctx, &usecase.GetUserByIDInput{ID: userID.(string)})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": nurse, "message": "Nurse profile retrieved successfully"})
}

// GetNurseByID retrieves a nurse by ID
// @Summary Get nurse by ID
// @Description Retrieve a nurse's information by their ID
// @Tags nurses
// @Accept json
// @Produce json
// @Param id path string true "Nurse ID"
// @Success 200 {object} map[string]interface{} "Nurse retrieved successfully"
// @Failure 404 {object} map[string]string "Nurse not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/nurses/{id} [get]
func (h *UserHandler) GetNurseByID(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	nurse, err := h.service.GetNurseByID(ctx, &usecase.GetUserByIDInput{ID: id})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": nurse, "message": "nurse retrieved successfully"})
}

// UpdateNurseByID updates a nurse by ID
// @Summary Update nurse
// @Description Update a nurse's information
// @Tags nurses
// @Accept json
// @Produce json
// @Param id path string true "Nurse ID"
// @Param input body dto.UpdateNurseRequest true "Nurse update information"
// @Success 200 {object} map[string]interface{} "Nurse updated successfully"
// @Failure 400 {object} map[string]string "Bad request"
// @Failure 404 {object} map[string]string "Nurse not found"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /users/nurses/{id} [patch]
func (h *UserHandler) UpdateNurseByID(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateNurseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	input := &usecase.UpdateUserInfoInput{
		ID:     id,
		Name:   req.Name,
		Email:  req.Email,
		Gender: domain.Gender(req.Gender),
		Phone:  req.Phone,
		StaffFieldsInput: usecase.StaffFieldsInput{
			DepartmentID:  req.DepartmentID,
			LicenseNumber: req.LicenseNumber,
			Workplace:     req.Workplace,
		},
		NurseFieldsInput: usecase.NurseFieldsInput{
			Ward:              req.Ward,
			YearsOfExperience: req.YearsOfExperience,
		},
	}

	if err := h.service.UpdateNurse(ctx, input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nurse updated successfully"})
}
