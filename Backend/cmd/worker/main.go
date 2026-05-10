package main

import (
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/worker"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("[Worker-warning] No .env file found")
	}
	if err := worker.Start(); err != nil {
		log.Fatal("[Worker-error] Failed to start worker:", err)
	} else {
		log.Println("[Worker] Worker started successfully")
	}
}
