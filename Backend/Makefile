gen_swagger:
	@if command -v swag >/dev/null 2>&1; then \
		swag init -g cmd/server/main.go -d . -o docs; \
	else \
		echo "Installing swag CLI..."; \
		go install github.com/swaggo/swag/cmd/swag@latest; \
		$$(go env GOPATH)/bin/swag init -g cmd/server/main.go -d . -o docs; \
	fi

run:
	go run cmd/server/main.go

format:
	gofmt -s -w .