package main

import (
	"log"

	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/worker"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("[GIN-warning] No .env file found")
	} else {
		log.Println("[GIN-info] Successfully loaded .env file")
	}

	if err := worker.Start(); err != nil {
		log.Fatal("[Worker-error] Failed to start worker:", err)
	} else {
		log.Println("[Worker] Worker started successfully")
	}
}
