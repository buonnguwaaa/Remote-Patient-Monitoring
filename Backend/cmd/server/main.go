package main

import (
	"fmt"
	"RPM-Backend/internal/config"
	"RPM-Backend/internal/cleanup"
	"github.com/joho/godotenv"
	"RPM-Backend/internal/api/router"
	"RPM-Backend/internal/repository"
	"log"
)

func main() {
   _ = godotenv.Load() // Load env
   err := config.Connect()
   if err != nil {
	   log.Fatal("Failed to connect to MongoDB:", err)
   }
   fmt.Println("Connected to MongoDB successfully!")

   db := config.Database()
   repository.InitRefreshTokenCollection(db)
   cleanup.StartRefreshTokenCleanup()

   r := router.SetupRouter()
   r.Run() // listens on 0.0.0.0:8080 by default
}
