package client

import (
	"log"
	"os"

	"go.temporal.io/sdk/client"
)

func New() (client.Client, error) {
	host := os.Getenv("TEMPORAL_HOST")
	if host == "" {
		host = "localhost:7233"
	}

	log.Printf("Connecting to Temporal server at host %s", host)
	return client.Dial(client.Options{
		HostPort: host,
	})
}
