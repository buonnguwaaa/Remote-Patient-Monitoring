SWAG := $(shell command -v swag 2> /dev/null)
GOBIN := $(shell go env GOPATH)/bin

gen_swagger:
ifndef SWAG
	@echo "swag cli package not found"
	@echo "Installing swag cli package..."
	@go install github.com/swaggo/swag/cmd/swag@latest
endif
	@$(GOBIN)/swag init -g cmd/server/main.go -d . -o docs
	@echo "Swagger docs generated successfully!"


run:
	@echo "Running server..."
	@go run cmd/server/main.go

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