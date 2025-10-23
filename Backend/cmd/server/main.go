package main

import (
	"fmt"
	"log"
	"os"

	"RPM-Backend/internal/api/router"
	"RPM-Backend/internal/cleanup"
	"RPM-Backend/internal/config"
	"RPM-Backend/internal/repository"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

func main() {

	if err := godotenv.Load(); err != nil {
		logrus.Warn("No .env file found")
	} else {
		logrus.Info("Successfully loaded .env file")
	}


	if err := config.Connect(); err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	fmt.Println("Connected to MongoDB successfully!")

	db := config.Database()
	repository.InitRefreshTokenCollection(db)
	cleanup.StartRefreshTokenCleanup()


	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(cors.Default())


	router.RegisterRoutes(r)


	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
