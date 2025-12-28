# AGENTS.md

This file provides guidance to IA Agents when working with code in this repository.

## Build and Development Commands

```bash
# Build (runs wire, swagger, lint, then compiles)
make build

# Run the service
make run

# Run unit tests with coverage
make test

# Run linter (golangci-lint)
make lint

# Generate Wire DI code
make wire

# Generate Swagger docs
make swagger

# Generate all (Wire + Swagger)
make gen

# Hot reload development (requires air)
make dev
```

### Integration Tests

Integration tests require Docker and use Testcontainers (PostgreSQL + Liquibase):

```bash
# Run all integration tests
go test -tags=integration -v -timeout 5m ./internal/adapters/secondary/database/postgres/...

# Run specific repository tests
go test -tags=integration -v -run TestTenantRepo ./internal/adapters/secondary/database/postgres/...

# Run tests in a specific repo package
go test -tags=integration -v ./internal/adapters/secondary/database/postgres/injectablerepo/...
```

## Architecture

Go microservice following **Hexagonal Architecture** (Ports and Adapters).

### Layer Structure

- **`internal/core/entity/`** - Domain entities and value objects
- **`internal/core/port/`** - Output port interfaces (repository contracts)
- **`internal/core/usecase/`** - Input port interfaces (use case contracts with command structs)
- **`internal/core/service/`** - Business logic implementing use case interfaces
- **`internal/adapters/primary/http/`** - Driving adapter (Gin HTTP handlers)
  - `controller/` - HTTP handlers
  - `dto/` - Request/Response DTOs
  - `mapper/` - Entity <-> DTO conversions
  - `middleware/` - JWT auth, workspace resolution
- **`internal/adapters/secondary/database/postgres/`** - Driven adapter (each repo in its own subpackage)
- **`internal/infra/`** - Infrastructure (config, DI, server bootstrap)

### Dependency Flow

```
HTTP Request → Controller → UseCase (interface) → Service → Port (interface) → Repository
```

### Repository Structure

Each repository lives in its own subpackage under `postgres/`:
```
postgres/
├── client.go                    # Connection pool creation
├── tenantrepo/
│   ├── repo.go                  # Repository implementation
│   └── queries.go               # SQL queries
├── workspacerepo/
├── tagrepo/
├── injectablerepo/
│   ├── repo.go
│   ├── queries.go
│   └── integrity_test.go        # Integration tests
└── ...
```

### Wire DI

Wire handles DI in `internal/infra/di.go`. After adding new services/repositories:
1. Add provider function to the appropriate Wire set in `di.go`
2. Run `make wire` to regenerate `cmd/api/wire_gen.go`

### Adding a New Feature

1. Define entity in `internal/core/entity/`
2. Create repository interface in `internal/core/port/`
3. Define use case interface with command structs in `internal/core/usecase/`
4. Implement service in `internal/core/service/`
5. Create PostgreSQL repository in `internal/adapters/secondary/database/postgres/<name>repo/`
6. Add DTOs in `internal/adapters/primary/http/dto/`
7. Create mapper in `internal/adapters/primary/http/mapper/`
8. Add controller in `internal/adapters/primary/http/controller/`
9. Register all in `internal/infra/di.go` with Wire bindings
10. Run `make wire` to regenerate DI

## Integration Tests

Files with `//go:build integration` tag. Tests use `testhelper.GetTestPool(t)` from `internal/testing/testhelper/` which:
- Starts PostgreSQL 16 container via Testcontainers
- Runs Liquibase migrations from `db/` directory
- Uses singleton pattern (one container per test run)
- Tests must clean up their own data with defer functions

Test pattern:
```go
//go:build integration

package myrepo_test

func TestMyRepo_Operation(t *testing.T) {
    pool := testhelper.GetTestPool(t)
    repo := myrepo.New(pool)
    ctx := context.Background()

    // Setup parent entities if needed
    // Create test entity
    // Defer cleanup
    // Assert results
}
```

## Configuration

Config loaded from `settings/app.yaml`, overridden via `DOC_ENGINE_` prefixed env vars.

Key variables:
- `DOC_ENGINE_DATABASE_HOST/PORT/USER/PASSWORD/NAME` - PostgreSQL connection
- `DOC_ENGINE_AUTH_JWKS_URL` - Keycloak JWKS endpoint
- `DOC_ENGINE_AUTH_ISSUER` - JWT issuer validation

## Key Technologies

- **Go 1.25**, **Gin** for HTTP, **pgx/v5** for PostgreSQL
- **Wire** for compile-time DI
- **Keycloak/JWKS** for JWT authentication
- **Testcontainers** for integration tests (PostgreSQL + Liquibase)
- **golangci-lint** with errcheck, gosimple, govet, staticcheck, gosec, revive, errorlint
