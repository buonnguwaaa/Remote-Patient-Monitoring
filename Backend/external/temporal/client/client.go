package client

import (
	"go.temporal.io/sdk/client"
)

func New() (client.Client, error) {
	return client.Dial(client.Options{})
}
