package config

import (
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
)

func NewCloudinaryClient() (*cloudinary.Cloudinary, error) {
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	return cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
}
