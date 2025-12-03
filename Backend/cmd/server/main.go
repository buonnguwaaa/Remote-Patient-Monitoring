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
	"log"
	"os"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	_ "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/docs"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/router"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	log.SetOutput(gin.DefaultWriter)
	log.SetFlags(0)

	if err := godotenv.Load(); err != nil {
		log.Println("[GIN-warning] No .env file found")
	} else {
		log.Println("[GIN-info] Successfully loaded .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

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
	config.InitGoogleOAuth2()

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(cors.Default())

	c := container.NewContainer()
	router.RegisterRoutes(r, c)

	log.Printf("[GIN-info] Starting server on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("[GIN-fatal] Failed to start server: %v", err)
	}
}
