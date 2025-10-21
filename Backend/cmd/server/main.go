package main

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"os"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		logrus.Warn("No .env file found")
	}
	logrus.Info("Successfully loaded .env file")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(cors.Default())
	routes.RegisterRoutes(r)

	r.Run(":" + port)
}
