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