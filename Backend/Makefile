SWAG := $(shell command -v swag 2> /dev/null)
GOBIN := $(shell go env GOPATH)/bin

gen_swagger:
ifndef SWAG
	@echo "swag cli package not found"
	@echo "Installing swag cli package..."
	@go install github.com/swaggo/swag/cmd/swag@latest
endif
	@$(GOBIN)/swag init -g main.go -d cmd/server,internal/handler,internal/dto,internal/usecase,internal/domain,internal/ws,config --parseInternal -o docs
	@echo "Swagger docs generated successfully!"


seed:
	@echo "Seeding database..."
	@go run cmd/seed/main.go

server:
	@echo "Running server..."
	@go run cmd/server/main.go

worker:
	@echo "Running temporal worker..."
	@go run cmd/worker/main.go

run:
	@echo "Running server & worker..."
	@go run cmd/server/main.go & \
	go run cmd/worker/main.go

format:
	@echo "Arrange imported packages..."
	@find . -name "*.go" | xargs goimports -w
	@echo "Formatting code by Golang formatter..."
	@gofmt -s -w .
	@echo "Code formatted successfully!"

static_check:
	@echo "Running Go static analysis to check implicit bugs..."
	@go vet ./...
	@echo "Static analysis completed!"

.PHONY: up up-dev up-prod
up:
	@echo "Specify environment: run 'make up-dev' or 'make up-prod'"

up-dev:
	@echo "Starting Docker containers (dev)..."
	@docker compose up -d
	@echo "Docker containers started successfully!"

up-prod:
	@echo "Starting Docker containers (production)..."
	@docker compose -f docker-compose.prod.yml up -d
	@echo "Docker containers for production started successfully!"

down-dev:
	@echo "Stopping Docker containers..."
	@docker compose down
	@echo "Docker containers stopped successfully!"

down-prod:
	@echo "Stopping Docker containers (production)..."
	@docker compose -f docker-compose.prod.yml down
	@echo "Docker containers for production stopped successfully!"