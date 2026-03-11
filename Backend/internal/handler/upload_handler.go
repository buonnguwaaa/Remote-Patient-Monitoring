package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/service"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/usecase"
	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	cloudinarySvc service.CloudinaryService
	userSvc       service.UserService
}

func NewUploadHandler(cloudinarySvc service.CloudinaryService, userSvc service.UserService) *UploadHandler {
	return &UploadHandler{
		cloudinarySvc: cloudinarySvc,
		userSvc:       userSvc,
	}
}

func (h *UploadHandler) UploadAvatar(c *gin.Context) {
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
	if currentUser, err := h.userSvc.GetUserByID(ctx, userID); err == nil {
		oldAvatarURL = currentUser.AvatarUrl
	}

	avatarUrl, err := h.cloudinarySvc.UploadAvatar(ctx, file, "rpm/avatars")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload thất bại: " + err.Error()})
		return
	}

	if err := h.userSvc.UpdateUser(ctx, &usecase.UpdateUserInput{
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
