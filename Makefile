-include .env
export

# Dummy auth flag: make run DUMMY=1 / make dev DUMMY=1
ifdef DUMMY
export DOC_ENGINE_AUTH_DUMMY=true
export VITE_DUMMY_AUTH=true
endif

.PHONY: build build-backend build-frontend run run-dummy dev dev-dummy dev-frontend test test-integration test-all lint lint-backend lint-frontend wire swagger gen docker-up docker-down doctor clean help

# ─── Build ────────────────────────────────────────────────────────

build: build-backend build-frontend

build-backend:
	$(MAKE) -C apps/doc-engine build

build-frontend:
	$(MAKE) -C apps/web-client build

# ─── Development ──────────────────────────────────────────────────

# Run backend + frontend (Ctrl+C stops both)
run:
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C apps/doc-engine run & \
	$(MAKE) -C apps/web-client dev & \
	wait

# Hot reload backend + frontend
dev:
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C apps/doc-engine dev & \
	$(MAKE) -C apps/web-client dev & \
	wait

# Shorthand: run/dev with dummy auth (bypass JWT)
run-dummy:
	$(MAKE) run DUMMY=1

dev-dummy:
	$(MAKE) dev DUMMY=1

dev-frontend:
	$(MAKE) -C apps/web-client dev

# ─── Quality ─────────────────────────────────────────────────────

test:
	$(MAKE) -C apps/doc-engine test

test-integration:
	$(MAKE) -C apps/doc-engine test-integration

test-all:
	$(MAKE) -C apps/doc-engine test-all

lint: lint-backend lint-frontend

lint-backend:
	$(MAKE) -C apps/doc-engine lint

lint-frontend:
	$(MAKE) -C apps/web-client lint

# ─── Codegen ─────────────────────────────────────────────────────

wire:
	$(MAKE) -C apps/doc-engine wire

swagger:
	$(MAKE) -C apps/doc-engine swagger

gen:
	$(MAKE) -C apps/doc-engine gen

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
	@printf "Wire............. " && which wire > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "Go build......... " && go build -C apps/doc-engine ./... > /dev/null 2>&1 && echo "ok" || echo "FAIL"
	@printf "Go modules....... " && go -C apps/doc-engine mod verify > /dev/null 2>&1 && echo "ok" || echo "FAIL"
	@echo ""
	@echo "Done."

# ─── Cleanup ─────────────────────────────────────────────────────

clean:
	$(MAKE) -C apps/doc-engine clean
	$(MAKE) -C apps/web-client clean

# ─── Help ────────────────────────────────────────────────────────

help:
	@echo "=== Build ==="
	@echo "  build            Build backend + frontend"
	@echo "  build-backend    Build Go backend only"
	@echo "  build-frontend   Build React frontend only"
	@echo ""
	@echo "=== Development ==="
	@echo "  run              Run backend + frontend (Ctrl+C stops both)"
	@echo "  run-dummy        Same as run, with dummy auth (no JWT needed)"
	@echo "  dev              Hot reload backend + frontend"
	@echo "  dev-dummy        Same as dev, with dummy auth (no JWT needed)"
	@echo "  dev-frontend     Start Vite dev server only"
	@echo ""
	@echo "=== Quality ==="
	@echo "  test             Run unit tests"
	@echo "  test-integration Run integration tests (requires Docker)"
	@echo "  test-all         Run all tests (unit + integration)"
	@echo "  lint             Lint backend + frontend"
	@echo "  lint-backend     Run golangci-lint"
	@echo "  lint-frontend    Run ESLint"
	@echo ""
	@echo "=== Codegen ==="
	@echo "  wire             Generate Wire DI code"
	@echo "  swagger          Generate Swagger docs"
	@echo "  gen              Generate all (Wire + Swagger + Extensions)"
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
