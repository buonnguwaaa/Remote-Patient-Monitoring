package auth

import (
	"context"
)

type Auth interface {
	Register(ctx context.Context, email string, password string, confirmedPassword string) (string, error)
	Login(ctx context.Context, email string, password string) (string, error)
}
