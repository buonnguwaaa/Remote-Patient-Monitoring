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
	"time"
	_ "time/tzdata" // embed timezone database so LoadLocation works on minimal images (alpine/scratch)

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/config"
	_ "github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/docs"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/container"
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/internal/middleware"
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
	if err := config.ConnectRedis(); err != nil {
		log.Fatalf("[GIN-fatal] Could not connect to Redis: %v", err)
	}
	defer func() {
		if err := config.DisconnectRedis(); err != nil {
			log.Printf("[GIN-error] Error disconnecting from Redis: %v", err)
		}
	}()

	// Load Firebase credentials from env (Base64) or file
	if err := config.LoadFirebaseCredentials(); err != nil {
		log.Fatalf("[GIN-fatal] Could not load Firebase credentials: %v", err)
	}

	config.InitGoogleOAuth2()

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Configure CORS to allow requests from frontend and allow credentials (cookies)
	webURL := os.Getenv("FE_WEB_URL")
	if webURL == "" {
		webURL = "http://localhost:3000"
	}
	adminURL := os.Getenv("FE_ADMIN_URL")
	if adminURL == "" {
		adminURL = "http://localhost:3001"
	}

	corsConfig := cors.Config{
		AllowOrigins:     []string{webURL, adminURL, "https://remotepatientmonitoring.xyz", "https://www.remotepatientmonitoring.xyz", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://192.168.1.24:3000", "http://192.168.1.24:8080", "http://192.168.1.4:8081", "http://192.168.1.4:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Location-Lat", "X-Location-Lng"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	r.Use(cors.New(corsConfig))

	c := container.NewMainServerContainer()

	// Add activity logger middleware for admin users
	activityLogger := middleware.NewActivityLoggerMiddleware(
		c.ActivityLogRepo,
		c.MeasurementRepo,
		c.PrescriptionRepo,
		c.BaseUserRepo,
	)
	r.Use(activityLogger.LogActivity())

	router.RegisterRoutes(r, c)

	log.Printf("[GIN-info] Starting server on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("[GIN-fatal] Failed to start server: %v", err)
	}
}
