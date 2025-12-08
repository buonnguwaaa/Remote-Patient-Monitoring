package main

import (
	"github.com/buonnguwaaa/Remote-Patient-Monitoring/Backend/external/temporal/worker"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		panic("Error loading .env file")
	}
	if err := worker.Start(); err != nil {
		panic(err)
	}
}
