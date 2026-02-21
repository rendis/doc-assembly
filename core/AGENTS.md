# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Build and Development Commands

```bash
# Build (runs wire, swagger, lint, then compiles)
make build

# Run the service
make run

# Run unit tests with coverage
make test

# Run integration tests
make test-integration

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

- **`internal/core/entity/`** - Domain entities and value objects (flat structure)
  - `portabledoc/` - PDF document format types
  - Entity files by domain:
    - **document**: `document.go`, `document_recipient.go`
    - **template**: `template.go`, `template_version.go`
    - **organization**: `tenant.go`, `workspace.go`, `user.go`
    - **injectable**: `injectable.go`, `system_injectable.go`
    - **catalog**: `folder.go`, `tag.go`
    - **signing**: `document_access_token.go`
    - **access**: `user_access_history.go`
    - **shared**: `enum.go`, `errors.go`, `format.go`, `injector_context.go`
- **`internal/core/port/`** - Output port interfaces (repository contracts)
- **`internal/core/usecase/`** - Input port interfaces organized by domain:
  - `document/` - Document lifecycle and signing
  - `template/` - Template and version management
  - `organization/` - Tenant, workspace, and member management
  - `injectable/` - Injectable definitions and assignments
  - `catalog/` - Folder and tag organization
  - `access/` - System roles and access history
- **`internal/core/service/`** - Business logic organized by domain:
  - `document/` - Document services
  - `template/` - Template services + `contentvalidator/`
  - `organization/` - Organization services
  - `injectable/` - Injectable services + dependency resolution
  - `catalog/` - Catalog services
  - `access/` - Access control services
  - `rendering/` - PDF rendering (`pdfrenderer/`)
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
3. Define use case interface with command structs in `internal/core/usecase/<domain>/` (choose appropriate domain folder)
4. Implement service in `internal/core/service/<domain>/` (matching domain folder)
5. Create PostgreSQL repository in `internal/adapters/secondary/database/postgres/<name>repo/`
6. Add DTOs in `internal/adapters/primary/http/dto/`
7. Create mapper in `internal/adapters/primary/http/mapper/`
8. Add controller in `internal/adapters/primary/http/controller/`
9. Register all in `internal/infra/di.go` with Wire bindings
10. Run `make wire` to regenerate DI

**Domain folders:** When adding usecases/services, place them in the appropriate domain:
- `document` - Document creation, signing, email verification gate, token-based signing, webhooks
- `template` - Template CRUD, versioning, content validation
- `organization` - Tenants, workspaces, members
- `injectable` - Injectable definitions and assignments
- `catalog` - Folders and tags
- `access` - System roles, access history

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

## Logging Guidelines

This project uses `log/slog` with a **ContextHandler** that automatically extracts attributes from `context.Context`.

**Documentation:** See `docs/logging-guide.md` for complete logging practices.

**Quick reference:**

```go
// ALWAYS use context-aware functions
slog.InfoContext(ctx, "user created", "user_id", user.ID)
slog.ErrorContext(ctx, "operation failed", "error", err)

// Add contextual attributes
ctx = logging.WithAttrs(ctx, slog.String("tenant_id", tenantID))
```

**Do NOT:**
- Inject `*slog.Logger` as a dependency
- Call `slog.Default()` in services/controllers
- Use `slog.Info()` without context
- Log sensitive data (passwords, tokens, PII)

## Go Best Practices

**Documentation:** See `docs/go-best-practices.md` for complete guide.

**Reference when:** Writing functions, designing APIs, handling errors, working with concurrency, or reviewing code.

## Database Schema

Database schema is managed with **Liquibase** in the `../../db/` directory (relative to doc-engine).

**Documentation:** See `../../db/DATABASE.md` for complete database model documentation.

> **IMPORTANT:** Agents must NEVER modify database schema files directly. Only READ for context and SUGGEST changes to the user.

### Directory Structure (Read-Only Reference)

```
../../db/
├── changelog.master.xml          # Master changelog (includes all changesets)
├── liquibase-*.properties        # Environment configurations
├── src/                          # Changesets organized by domain
│   ├── schemas/                  # Schema definitions
│   ├── types/                    # Enum types
│   ├── tables/                   # Table definitions
│   ├── indexes/                  # Index definitions
│   ├── constraints/              # FK and check constraints
│   ├── triggers/                 # Trigger functions
│   └── content/                  # Seed data
└── DATABASE.md                   # Model documentation
```

### Agent Guidelines

- **READ** `DATABASE.md` to understand the data model
- **READ** changeset files to understand existing schema
- **SUGGEST** schema changes when needed (never apply directly)
- **REFERENCE** table/column names accurately in Go code

## Extensibility System

The project includes an extensibility system for custom injectors, mappers, and initialization logic.

**Documentation:** See `docs/extensibility-guide.md` for complete guide.

**Quick reference:**
- `//docengine:injector` - Mark struct as injector (multiple allowed)
- `//docengine:mapper` - Mark struct as mapper (ONE only)
- `//docengine:init` - Mark function as init (ONE only)
- `make gen` - Regenerate `internal/extensions/registry_gen.go`

**Key files:**
- `internal/extensions/injectors/` - Custom injectors
- `internal/extensions/mappers/` - Request mapper
- `internal/extensions/init.go` - Init function
- `settings/injectors.i18n.yaml` - Injector translations for frontend

## Public Signing Flow

Public document signing uses email verification + token-based access (no JWT auth).

**Key services:**
- `internal/core/service/document/document_access_service.go` — `RequestAccess()`, email gate
- `internal/core/service/document/pre_signing_service.go` — `GetPublicSigningPage()`, `SubmitPreSigningForm()`, `ProceedToSigning()`, `InvalidateTokens()`
- `internal/core/service/document/notification_service.go` — `NotifyDocumentCreated()`, `SendAccessLink()`

**Key controllers:**
- `internal/adapters/primary/http/controller/public_document_access_controller.go` — `/public/doc/*`
- `internal/adapters/primary/http/controller/public_signing_controller.go` — `/public/sign/*`

**Patterns:**
- Anti-enumeration: `RequestAccess` returns nil (200) for invalid emails, missing docs, rate limits
- Token types: `SIGNING` (no interactive fields) vs `PRE_SIGNING` (has interactive fields)
- Tokens: 128-char hex, single-use (`used_at`), expiring (configurable TTL)
- Rate limiting: per document+recipient pair, configurable in `settings/app.yaml` → `public_access`
- `buildSigningURL()` fallback: active token → `/public/doc/{docID}`

**Documentation:** `docs/public-signing-flow.md`

## Mandatory Documentation Updates

### Authorization Matrix (`docs/authorization-matrix.md`)

**MUST update** this file when ANY of the following changes occur:

1. **New endpoint** - Adding any new HTTP endpoint
2. **Permission change** - Modifying required roles for an existing endpoint
3. **New role** - Adding new system/tenant/workspace roles
4. **Header requirements** - Changing required headers for endpoints
5. **New controller** - Creating a new controller file
6. **Authorization middleware** - Modifying authorization logic in middlewares

The authorization matrix documents all API endpoints with their permission requirements per role. Keeping it synchronized ensures accurate security documentation.

### Extensibility Guide (`docs/extensibility-guide.md`)

**MUST update** this file when ANY of the following changes occur:

1. **Injector interface** - Changes to `port.Injector` (new methods, signatures)
2. **RequestMapper interface** - Changes to `port.RequestMapper`
3. **InitFunc interface** - Changes to init function or `InitDeps`
4. **InjectorContext** - New methods available in the context
5. **Formatters** - Adding/modifying presets in `internal/core/formatter`
6. **Code markers** - New `//docengine:*` markers
7. **Directory structure** - Changes to `internal/extensions/` layout
8. **Code generation** - Changes to `docengine-gen` or its output

The extensibility guide documents how to create custom injectors, mappers, and init functions. It must reflect the current interfaces and patterns.

### Go Best Practices (`docs/go-best-practices.md`)

**SHOULD update** this file when:

1. **New patterns** - Discovering new Go best practices or patterns
2. **Project conventions** - Establishing project-specific coding standards
3. **Modern Go features** - Documenting usage of new Go version features
4. **Anti-patterns found** - Adding anti-patterns discovered during code review

This guide serves as the team's reference for Go coding standards. Keep it updated with relevant patterns used in the project.

## Mandatory Verification Checklist

**BEFORE considering any complex development work as complete**, agents MUST run and verify ALL of the following commands pass:

```bash
# 1. Regenerate Wire DI
make wire

# 2. Build (includes swagger generation and lint)
make build

# 3. Run unit tests
make test

# 4. Run linter explicitly
make lint

# 5. Verify integration tests compile
go build -tags=integration ./...

# 6. (If Docker available) Run integration/E2E tests
make test-integration
```

### Verification Criteria

| Command | Expected Result |
|---------|-----------------|
| `make wire` | Regenerated successfully, no errors |
| `make build` | Compiled without errors |
| `make test` | All unit tests passed |
| `make lint` | No lint errors |
| `go build -tags=integration ./...` | Integration tests compile |
| `make test-integration` | All E2E tests passed (requires Docker) |

> **IMPORTANT:** Do NOT claim work is complete until ALL verifications pass. Files with `//go:build integration` tag are NOT compiled by `make test` - they require `-tags=integration` flag. Always verify integration tests compile even if not running them.
