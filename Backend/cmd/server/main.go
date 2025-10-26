// @title Remote Patient Monitoring API
// @version 1.0
// @description A REST API for remote patient monitoring system
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /
// @schemes http https

package main

import (
	"fmt"
	"log"
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	docs "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/docs"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/cleanup"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/repositories"
	routes "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		logrus.Warn("No .env file found")
	} else {
		logrus.Info("Successfully loaded .env file")
	}

	// Connect to MongoDB
	if err := config.ConnectMongo(); err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	fmt.Println("Connected to MongoDB successfully!")

	// Initialize refresh token collection and cleanup
	db := config.Mongo.Database
	repositories.InitRefreshTokenCollection(db)
	cleanup.StartRefreshTokenCleanup()

	// Setup Gin
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := config.ConnectMongo(); err != nil {
		log.Fatalf("[GIN-fatal] Could not connect to MongoDB: %v", err)
	}
	defer func() {
		if err := config.DisconnectMongo(); err != nil {
			log.Printf("[GIN-error] Error disconnecting from MongoDB: %v", err)
		}
	}()

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(cors.Default())

	// Register routes
	// Configure swagger doc base path
	docs.SwaggerInfo.BasePath = "/"
	routes.RegisterRoutes(r)

	// Get port from env or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
