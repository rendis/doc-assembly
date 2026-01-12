.PHONY: all build run test test-integration test-all lint wire swagger docengine-gen gen clean tidy coverage coverage-all help

# Variables
BINARY_NAME=doc-engine
BUILD_DIR=bin
CMD_DIR=cmd/api

# Environment file (default: .env in workspace root)
ENV_FILE?=.env

# Default target
all: build

# Build the application
build: wire swagger lint
	@echo "Building $(BINARY_NAME)..."
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) ./$(CMD_DIR)

# Run the application
# Usage: make run [ENV_FILE=path/to/.env]
run: build
	@echo "Running $(BINARY_NAME) with env from $(ENV_FILE)..."
	@if [ -f $(ENV_FILE) ]; then \
		export $$(cat $(ENV_FILE) | grep -v '^#' | xargs) && \
		./$(BUILD_DIR)/$(BINARY_NAME); \
	else \
		echo "Warning: $(ENV_FILE) not found, running without environment file"; \
		./$(BUILD_DIR)/$(BINARY_NAME); \
	fi

# Run tests with race detection and coverage
test:
	@echo "Running unit tests..."
	@go test -race -cover -coverprofile=coverage.out -coverpkg=./internal/core/...,./internal/adapters/... ./...
	@go tool cover -func=coverage.out

# Run integration tests (requires Docker)
test-integration:
	@echo "Running integration tests..."
	@go test -tags=integration -race -cover -coverprofile=coverage-integration.out -coverpkg=./internal/core/...,./internal/adapters/... -timeout 10m ./...
	@go tool cover -func=coverage-integration.out

# Run all tests (unit + integration)
test-all:
	@echo "Running all tests (unit + integration)..."
	@go test -tags=integration -race -cover -coverprofile=coverage-all.out -coverpkg=./internal/core/...,./internal/adapters/... -timeout 10m ./...
	@go tool cover -func=coverage-all.out

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run ./...

# Generate Wire dependency injection
wire:
	@echo "Generating Wire DI..."
	@cd $(CMD_DIR) && wire && cd ../..

# Generate Swagger documentation
swagger:
	@echo "Generating Swagger docs..."
	@swag init -g ./internal/infra/server/http.go -o ./docs --parseDependency --parseInternal

# Generate docengine extensions registry
docengine-gen:
	@echo "Generating docengine extensions registry..."
	@go run ./tools/docengine-gen/main.go

# Generate all (Wire + Swagger + Docengine Extensions)
gen: wire swagger docengine-gen
	@echo "Code generation complete."

# Generate and open HTML coverage report (run 'make test' first)
coverage:
	@echo "Opening coverage report..."
	@go tool cover -html=coverage.out -o coverage.html
	@open coverage.html

# Run all tests and open HTML coverage report
coverage-all: test-all
	@echo "Opening coverage report..."
	@go tool cover -html=coverage-all.out -o coverage-all.html
	@open coverage-all.html

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out coverage-integration.out coverage-all.out
	@rm -f coverage.html coverage-all.html
	@rm -rf docs

# Tidy dependencies
tidy:
	@echo "Tidying dependencies..."
	@go mod tidy

# Development: run with hot reload (requires air)
dev:
	@air

# Help
help:
	@echo "Available targets:"
	@echo "  all              - Build the application (default)"
	@echo "  build            - Build the binary"
	@echo "  run [ENV_FILE]   - Build and run the application (default: .env)"
	@echo "  test             - Run unit tests with coverage"
	@echo "  test-integration - Run integration tests (requires Docker)"
	@echo "  test-all         - Run all tests (unit + integration)"
	@echo "  coverage         - Open HTML coverage report (run 'make test' first)"
	@echo "  coverage-all     - Run all tests and open HTML coverage report"
	@echo "  lint             - Run golangci-lint"
	@echo "  wire             - Generate Wire DI code"
	@echo "  swagger          - Generate Swagger documentation"
	@echo "  docengine-gen    - Generate extensions registry (auto-discover injectors/mappers)"
	@echo "  gen              - Generate all (Wire + Swagger + Docengine Extensions)"
	@echo "  clean            - Remove build artifacts"
	@echo "  tidy             - Tidy go.mod dependencies"
	@echo "  dev              - Run with hot reload (requires air)"
	@echo "  help             - Show this help message"
