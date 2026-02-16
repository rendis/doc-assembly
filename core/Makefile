.PHONY: all build build-full run run-dummy test test-integration test-all lint fmt swagger migrate clean tidy dev dev-dummy coverage coverage-all help

# Variables
BINARY_NAME=doc-engine
BUILD_DIR=bin
CMD_DIR=cmd/api

# Environment file (default: .env in workspace root)
ENV_FILE?=.env

# Dummy auth flag: make run DUMMY=1
ifdef DUMMY
export DOC_ENGINE_AUTH_DUMMY=true
endif

# Default target
all: build

# Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) ./$(CMD_DIR)

# Full build: swagger + lint + build
build-full: swagger lint build

# Run the application
# Usage: make run [ENV_FILE=path/to/.env]
run:
	@echo "Running $(BINARY_NAME) with env from $(ENV_FILE)..."
	@if [ -f $(ENV_FILE) ]; then \
		export $$(cat $(ENV_FILE) | grep -v '^#' | xargs) && \
		go run ./$(CMD_DIR); \
	else \
		echo "Warning: $(ENV_FILE) not found, running without environment file"; \
		go run ./$(CMD_DIR); \
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

# Format Go code
fmt:
	@echo "Formatting Go code..."
	@gofmt -w .

# Generate Swagger documentation
swagger:
	@echo "Generating Swagger docs..."
	@swag init -g ./internal/infra/server/http.go -o ./docs --parseDependency --parseInternal

# Run database migrations
migrate:
	@echo "Running database migrations..."
	@go run ./$(CMD_DIR) migrate

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

# Shorthand: run/dev with dummy auth (bypass JWT)
run-dummy:
	$(MAKE) run DUMMY=1

dev-dummy:
	$(MAKE) dev DUMMY=1

# Development: run with hot reload (requires air)
# Usage: make dev [ENV_FILE=path/to/.env]
dev:
	@if [ -f $(ENV_FILE) ]; then \
		export $$(cat $(ENV_FILE) | grep -v '^#' | xargs) && \
		air; \
	else \
		echo "Warning: $(ENV_FILE) not found, running air without environment file"; \
		air; \
	fi

# Help
help:
	@echo "Available targets:"
	@echo "  all              - Build the application (default)"
	@echo "  build            - Build the binary"
	@echo "  build-full       - Generate + lint + build (full cycle)"
	@echo "  run [ENV_FILE]   - Run the application (default: .env)"
	@echo "  run-dummy        - Run with dummy auth (no JWT needed)"
	@echo "  test             - Run unit tests with coverage"
	@echo "  test-integration - Run integration tests (requires Docker)"
	@echo "  test-all         - Run all tests (unit + integration)"
	@echo "  coverage         - Open HTML coverage report (run 'make test' first)"
	@echo "  coverage-all     - Run all tests and open HTML coverage report"
	@echo "  lint             - Run golangci-lint"
	@echo "  fmt              - Format Go code with gofmt"
	@echo "  swagger          - Generate Swagger documentation"
	@echo "  migrate          - Run database migrations"
	@echo "  clean            - Remove build artifacts"
	@echo "  tidy             - Tidy go.mod dependencies"
	@echo "  dev              - Run with hot reload (requires air)"
	@echo "  dev-dummy        - Hot reload with dummy auth (no JWT needed)"
	@echo "  help             - Show this help message"
	@echo ""
	@echo "Flags:"
	@echo "  DUMMY=1          - Force dummy auth (bypass JWT). Example: make run DUMMY=1"
