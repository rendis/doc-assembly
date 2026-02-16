-include .env
export

# Dummy auth flag: make run DUMMY=1 / make dev DUMMY=1
ifdef DUMMY
export DOC_ENGINE_AUTH_DUMMY=true
export VITE_DUMMY_AUTH=true
endif

.PHONY: build build-core build-app embed-app run run-dummy dev dev-dummy dev-app test test-integration test-all lint lint-core lint-app swagger migrate docker-up docker-down doctor clean help

# ─── Build ────────────────────────────────────────────────────────

build: embed-app build-core

build-core:
	$(MAKE) -C core build

build-app:
	$(MAKE) -C app build

# Build frontend and embed into Go binary
embed-app: build-app
	@echo "Embedding frontend..."
	@rm -rf core/internal/frontend/dist/*
	@cp -r app/dist/* core/internal/frontend/dist/

# ─── Development ──────────────────────────────────────────────────

# Run backend + frontend (Ctrl+C stops both)
run:
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C core run & \
	$(MAKE) -C app dev & \
	wait

# Shorthand: run/dev with dummy auth (bypass JWT)
run-dummy:
	$(MAKE) run DUMMY=1

dev-dummy:
	$(MAKE) dev DUMMY=1

# Hot reload backend + frontend
dev:
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C core dev & \
	$(MAKE) -C app dev & \
	wait

dev-app:
	$(MAKE) -C app dev

# ─── Quality ─────────────────────────────────────────────────────

test:
	$(MAKE) -C core test

test-integration:
	$(MAKE) -C core test-integration

test-all:
	$(MAKE) -C core test-all

lint: lint-core lint-app

lint-core:
	$(MAKE) -C core lint

lint-app:
	$(MAKE) -C app lint

# ─── Codegen ─────────────────────────────────────────────────────

swagger:
	$(MAKE) -C core swagger

# ─── Database ────────────────────────────────────────────────────

migrate:
	$(MAKE) -C core migrate

# ─── Docker ──────────────────────────────────────────────────────

docker-up:
	docker compose up --build

docker-down:
	docker compose down

# ─── Doctor ──────────────────────────────────────────────────────

doctor:
	@echo "=== doc-assembly doctor ==="
	@echo ""
	@printf "Go............... " && go version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "Typst............ " && typst --version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "PostgreSQL....... " && pg_isready > /dev/null 2>&1 && echo "ok" || echo "not running"
	@printf "pnpm............. " && pnpm --version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "golangci-lint.... " && golangci-lint --version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "Go build......... " && go build ./core/cmd/api > /dev/null 2>&1 && echo "ok" || echo "FAIL"
	@printf "Go modules....... " && go mod verify > /dev/null 2>&1 && echo "ok" || echo "FAIL"
	@echo ""
	@echo "Done."

# ─── Cleanup ─────────────────────────────────────────────────────

clean:
	$(MAKE) -C core clean

# ─── Help ────────────────────────────────────────────────────────

help:
	@echo "=== Build ==="
	@echo "  build            Build frontend, embed, and compile Go binary"
	@echo "  build-core       Build Go backend only"
	@echo "  build-app        Build React frontend only"
	@echo "  embed-app        Build + embed frontend into Go binary"
	@echo ""
	@echo "=== Development ==="
	@echo "  run              Run backend + frontend (Ctrl+C stops both)"
	@echo "  run-dummy        Same as run, with dummy auth (no JWT needed)"
	@echo "  dev              Hot reload backend + frontend"
	@echo "  dev-dummy        Same as dev, with dummy auth (no JWT needed)"
	@echo "  dev-app          Start Vite dev server only"
	@echo ""
	@echo "=== Quality ==="
	@echo "  test             Run unit tests"
	@echo "  test-integration Run integration tests (requires Docker)"
	@echo "  test-all         Run all tests (unit + integration)"
	@echo "  lint             Lint backend + frontend"
	@echo ""
	@echo "=== Database ==="
	@echo "  migrate          Run database migrations"
	@echo ""
	@echo "=== Codegen ==="
	@echo "  swagger          Generate Swagger docs"
	@echo ""
	@echo "=== Docker ==="
	@echo "  docker-up        Start all services with Docker Compose"
	@echo "  docker-down      Stop all services"
	@echo ""
	@echo "=== Utilities ==="
	@echo "  doctor           Check system dependencies and build health"
	@echo "  clean            Remove all build artifacts"
	@echo ""
	@echo "=== Flags ==="
	@echo "  DUMMY=1          Force dummy auth (bypass JWT). Example: make run DUMMY=1"
