package service

import (
	"context"
	"mime/multipart"
	"os"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type CloudinaryService interface {
	UploadAvatar(ctx context.Context, file multipart.File, folder string) (string, error)
	DeleteAsset(ctx context.Context, publicID string) error
}

type cloudinaryService struct {
	cld *cloudinary.Cloudinary
}

func NewCloudinaryService() (CloudinaryService, error) {
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}
	return &cloudinaryService{cld: cld}, nil
}

func (s *cloudinaryService) UploadAvatar(ctx context.Context, file multipart.File, folder string) (string, error) {
	uploadResult, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder:         folder,
		ResourceType:   "image",
		Transformation: "c_limit,w_800,h_800,q_auto,f_auto", 
	})
	if err != nil {
		return "", err
	}
	return uploadResult.SecureURL, nil
}

func (s *cloudinaryService) DeleteAsset(ctx context.Context, publicID string) error {
	_, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: "image",
	})
	return err
}

func ExtractPublicID(rawURL string) string {
	if rawURL == "" || !strings.Contains(rawURL, "cloudinary.com") {
		return ""
	}

	parts := strings.SplitN(rawURL, "/upload/", 2)
	if len(parts) < 2 {
		return ""
	}
	rest := parts[1] 

	segments := strings.Split(rest, "/")
	startIdx := 0
	for i, seg := range segments {
		if len(seg) > 1 && seg[0] == 'v' {
			isVersion := true
			for _, c := range seg[1:] {
				if c < '0' || c > '9' {
					isVersion = false
					break
				}
			}
			if isVersion {
				startIdx = i + 1
				break
			}
		}
	}

	publicIDWithExt := strings.Join(segments[startIdx:], "/")

	if dotIdx := strings.LastIndex(publicIDWithExt, "."); dotIdx >= 0 {
		return publicIDWithExt[:dotIdx]
	}
	return publicIDWithExt
}
