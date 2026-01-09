# Doc Engine

Document Assembly System API - A microservice for template management and document generation.

## Overview

Doc Engine is a Go-based microservice that provides:
- **Workspace Management**: Multi-tenant workspace organization with role-based access control
- **Template Management**: Create, edit, publish, and clone document templates
- **Injectable Variables**: Define and manage dynamic variables for document generation
- **Folder Organization**: Hierarchical folder structure for template organization
- **Tag System**: Flexible tagging for template categorization
- **Signer Role Management**: Configure signature roles and anchors for e-signature integration
- **AI Contract Generation**: Generate structured contract documents from images, PDFs, DOCX files, or text descriptions using LLM

## Architecture

The project follows **Hexagonal Architecture** (Ports and Adapters):

```
internal/
├── core/                      # Domain Layer (business logic)
│   ├── entity/               # Domain entities and value objects
│   ├── port/                 # Output ports (repository interfaces)
│   ├── service/              # Business logic implementation
│   └── usecase/              # Input ports (use case interfaces + commands)
│
├── adapters/
│   ├── primary/http/         # Driving adapters (HTTP API)
│   │   ├── controller/       # HTTP handlers
│   │   ├── dto/              # Request/Response DTOs
│   │   ├── mapper/           # Entity <-> DTO mappers
│   │   └── middleware/       # HTTP middleware
│   │
│   └── secondary/            # Driven adapters
│       ├── database/postgres/ # PostgreSQL repositories
│       └── llm/              # LLM providers (OpenAI, etc.)
│
└── infra/                    # Infrastructure
    ├── config/               # Configuration loading
    ├── server/               # HTTP server setup
    ├── di.go                 # Wire dependency injection
    └── initializer.go        # Application bootstrap
```

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Go | 1.25 |
| HTTP Framework | Gin | 1.10.0 |
| Database | PostgreSQL | 15+ |
| DB Driver | pgx/v5 | 5.7.2 |
| DI | Wire | 0.6.0 |
| Config | Viper | 1.19.0 |
| JWT | golang-jwt/v5 | 5.3.0 |
| JWKS | keyfunc/v3 | 3.7.0 |
| OpenAI SDK | go-openai | latest |

## Prerequisites

- Go 1.25+
- PostgreSQL 15+
- golangci-lint (for linting)
- Wire CLI (for dependency injection)
- swag CLI (for Swagger docs)

### Install Tools

```bash
# Wire
go install github.com/google/wire/cmd/wire@latest

# Swagger
go install github.com/swaggo/swag/cmd/swag@latest

# golangci-lint
brew install golangci-lint  # macOS

# or
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

## Getting Started

### 1. Clone and Setup

```bash
cd apps/doc-engine
go mod tidy
```

### 2. Configuration

Default values are defined in `settings/app.yaml`. Override them using environment variables with the `DOC_ENGINE_` prefix:

```bash
export DOC_ENGINE_DATABASE_PASSWORD=your_password
export DOC_ENGINE_AUTH_JWKS_URL=https://your-keycloak/realms/your-realm/protocol/openid-connect/certs
export DOC_ENGINE_AUTH_ISSUER=https://your-keycloak/realms/your-realm
```

### 3. Build and Run

```bash
# Using Makefile with default .env
make build
make run

# Or specify a custom env file
make run ENV_FILE=.env.production

# Or directly (requires manually setting env vars)
go build -o bin/doc-engine ./cmd/api
./bin/doc-engine
```

## Configuration

Configuration is loaded from `settings/app.yaml` and can be overridden with environment variables using the prefix `DOC_ENGINE_`.

| Variable | Description | Default |
|----------|-------------|---------|
| `DOC_ENGINE_SERVER_PORT` | HTTP server port | 8080 |
| `DOC_ENGINE_DATABASE_HOST` | PostgreSQL host | localhost |
| `DOC_ENGINE_DATABASE_PORT` | PostgreSQL port | 5432 |
| `DOC_ENGINE_DATABASE_USER` | Database user | admin |
| `DOC_ENGINE_DATABASE_PASSWORD` | Database password | - |
| `DOC_ENGINE_DATABASE_NAME` | Database name | doc_engine_v1 |
| `DOC_ENGINE_AUTH_JWKS_URL` | Keycloak JWKS endpoint | - |
| `DOC_ENGINE_AUTH_ISSUER` | JWT issuer | - |
| `DOC_ENGINE_LLM_PROVIDER` | LLM provider (openai) | openai |
| `DOC_ENGINE_LLM_OPENAI_API_KEY` | OpenAI API key | - |
| `DOC_ENGINE_LLM_OPENAI_MODEL` | OpenAI model | gpt-4o |

## API Endpoints

For a complete list of API endpoints, authentication requirements, roles, and required headers, see **[authorization-matrix.md](authorization-matrix.md)**.

## Sandbox & Promotion Flow

Doc Engine supports a **sandbox environment** for each workspace, allowing users to develop and test templates in isolation before promoting them to production.

### Sandbox Concept

```
Production Workspace (is_sandbox=false)
├── Templates (production-ready)
├── Versions (DRAFT, PUBLISHED, ARCHIVED)
└── Sandbox Workspace (is_sandbox=true, sandbox_of_id=parent)
    ├── Templates (development/testing)
    └── Versions (isolated from production)
```

- Each CLIENT workspace automatically has a sandbox workspace (1:1 relationship)
- Sandbox workspaces are created via database trigger when a CLIENT workspace is created
- **Tags** and **Injectables** are shared between production and sandbox (belong to parent workspace)
- **Templates**, **Versions**, and **Folders** are isolated per environment

### Accessing Sandbox Mode

To operate in sandbox mode, add the `X-Sandbox-Mode: true` header to your requests:

```bash
# List templates in production
curl -X GET /api/v1/content/templates \
  -H "X-Workspace-ID: {workspace-id}" \
  -H "Authorization: Bearer ..."

# List templates in sandbox
curl -X GET /api/v1/content/templates \
  -H "X-Workspace-ID: {workspace-id}" \
  -H "X-Sandbox-Mode: true" \
  -H "Authorization: Bearer ..."
```

### Endpoints with Sandbox Support

| Endpoint | Sandbox Support |
|----------|-----------------|
| `/api/v1/workspace/folders/*` | Yes |
| `/api/v1/content/templates/*` | Yes |
| `/api/v1/content/templates/:id/versions/*` | Yes |
| `/api/v1/workspace/tags/*` | No (shared) |
| `/api/v1/content/injectables/*` | No (shared) |

### Version Promotion Flow

Once a template version is tested and ready in sandbox, it can be **promoted to production** using the promote endpoint:

```
POST /api/v1/content/templates/:templateId/versions/:versionId/promote
```

#### Promotion Modes

| Mode | Description |
|------|-------------|
| `NEW_TEMPLATE` | Creates a new template in production with the promoted version |
| `NEW_VERSION` | Adds the promoted version to an existing production template |

#### Request Body

```json
{
  "mode": "NEW_TEMPLATE",
  "targetTemplateId": null,        // Required only for NEW_VERSION
  "targetFolderId": "uuid | null", // Optional, only for NEW_TEMPLATE
  "versionName": "v2.0"            // Optional, default: "Promoted from Sandbox"
}
```

#### Promotion Requirements

- Source version **must be PUBLISHED** in sandbox
- **Target workspace must be a production workspace** (not a sandbox) - attempting to promote to a sandbox workspace will result in a `400 Bad Request` error
- Promoted version arrives as **DRAFT** in production (requires review before publishing)
- For `NEW_TEMPLATE`: Template title must be unique in production workspace
- For `NEW_VERSION`: Target template must belong to the production workspace

#### What Gets Copied

| Item | NEW_TEMPLATE | NEW_VERSION |
|------|--------------|-------------|
| Content Structure (JSONB) | Yes | Yes |
| Injectables | Yes | Yes |
| Signer Roles | Yes | Yes |
| Tags | Yes | No |

#### Example: Promote as New Template

```bash
curl -X POST /api/v1/content/templates/{sandboxTemplateId}/versions/{publishedVersionId}/promote \
  -H "X-Workspace-ID: {prod-workspace-id}" \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "NEW_TEMPLATE",
    "targetFolderId": null,
    "versionName": "Initial Release"
  }'
```

Response:
```json
{
  "template": {
    "id": "new-template-uuid",
    "workspaceId": "prod-workspace-id",
    "title": "Contract Template",
    ...
  },
  "version": {
    "id": "new-version-uuid",
    "templateId": "new-template-uuid",
    "versionNumber": 1,
    "name": "Initial Release",
    "status": "DRAFT",
    ...
  }
}
```

#### Example: Promote as New Version

```bash
curl -X POST /api/v1/content/templates/{sandboxTemplateId}/versions/{publishedVersionId}/promote \
  -H "X-Workspace-ID: {prod-workspace-id}" \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "NEW_VERSION",
    "targetTemplateId": "{existingProdTemplateId}",
    "versionName": "v2.0 - New Features"
  }'
```

Response:
```json
{
  "version": {
    "id": "new-version-uuid",
    "templateId": "existing-prod-template-id",
    "versionNumber": 3,
    "name": "v2.0 - New Features",
    "status": "DRAFT",
    ...
  }
}
```

### Typical Workflow

```
1. Create/Edit template in SANDBOX
   └─> Template exists only in sandbox workspace

2. Test and iterate in SANDBOX
   └─> Make changes, preview, validate

3. Publish version in SANDBOX
   └─> Version status: DRAFT → PUBLISHED

4. Promote to PRODUCTION
   └─> POST /promote with mode=NEW_TEMPLATE or NEW_VERSION
   └─> New version created in prod with status: DRAFT

5. Review in PRODUCTION
   └─> Verify content, make final adjustments if needed

6. Publish in PRODUCTION
   └─> POST /:versionId/publish
   └─> Version status: DRAFT → PUBLISHED
   └─> Template now available for document generation
```

## Development

### Make Commands

```bash
make help             # Show all available commands
make build            # Build the binary
make run [ENV_FILE]   # Build and run (default: .env)
make test             # Run unit tests with coverage
make test-integration # Run integration tests (requires Docker)
make test-all         # Run all tests (unit + integration)
make coverage         # Open HTML coverage report (run 'make test' first)
make coverage-all     # Run all tests and open HTML coverage report
make lint             # Run golangci-lint
make wire             # Generate Wire DI code
make swagger          # Generate Swagger docs
make gen              # Generate all (Wire + Swagger)
make tidy             # Tidy dependencies
make clean            # Clean build artifacts
make dev              # Run with hot reload (requires air)
```

### Adding a New Feature

1. **Define entities** in `internal/core/entity/`
2. **Create port interfaces** in `internal/core/port/`
3. **Define use case interface** in `internal/core/usecase/`
4. **Implement service** in `internal/core/service/`
5. **Create repository** in `internal/adapters/secondary/database/postgres/`
6. **Add DTOs** in `internal/adapters/primary/http/dto/`
7. **Create mapper** in `internal/adapters/primary/http/mapper/`
8. **Add controller handlers** in `internal/adapters/primary/http/controller/`
9. **Register in Wire** in `internal/infra/di.go`
10. **Run `make wire`** to regenerate DI

### Code Style

The project uses golangci-lint with the following enabled linters:
- errcheck, gosimple, govet, staticcheck, unused
- gofmt, goimports, misspell
- gocritic, revive, gosec
- errorlint, exhaustive

Run `make lint` before committing.

## Integration Tests

The project includes comprehensive integration tests that validate repository operations against a real PostgreSQL database using **[Testcontainers](https://golang.testcontainers.org)**.

### Prerequisites

- **Docker** installed and running
- ~500MB disk space for Docker images (downloaded on first run)

### Test Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  go test -tags=integration ./...                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    testhelper.GetTestPool(t)                │
│                                                             │
│  ┌─────────────────┐    ┌────────────────────────────────┐  │
│  │ PostgreSQL      │◄───│ Liquibase Container            │  │
│  │ Container       │    │ (applies all migrations)       │  │
│  │ (postgres:16)   │    │ (liquibase:4.30-alpine)        │  │
│  └─────────────────┘    └────────────────────────────────┘  │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Singleton pattern - one container per test run          ││
│  │ Tests clean up their own data with defer functions      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Running Integration Tests

```bash
# Run all integration tests
go test -tags=integration -v -timeout 10m ./internal/adapters/secondary/database/postgres/...

# Run specific test file
go test -tags=integration -v -run TestTenantRepo ./internal/adapters/secondary/database/postgres/...

# Run with short timeout (after first run, images are cached)
go test -tags=integration -v -timeout 5m ./internal/adapters/secondary/database/postgres/...
```

### Test Coverage

| Repository | Tests | Coverage |
|------------|-------|----------|
| TenantRepo | 14 | CRUD, constraints, triggers |
| WorkspaceRepo | 10 | CRUD, enums, unique constraints |
| WorkspaceMemberRepo | 11 | CRUD, roles, cascades |
| TenantMemberRepo | 13 | CRUD, roles, cascades |
| FolderRepo | ~10 | Hierarchy, path validation |
| TagRepo | ~10 | CRUD, workspace isolation |
| InjectableRepo | ~10 | CRUD, workspace isolation |
| TemplateRepo | ~15 | CRUD, status workflow |
| TemplateVersionRepo | ~15 | Versioning, publishing |
| TemplateVersionRelationsRepo | ~10 | Injectables, signer roles |

### Test Timing

| Phase | Duration |
|-------|----------|
| First run (download images) | ~30-60s |
| Container startup | ~2-3s |
| Liquibase migrations | ~3-5s |
| All tests execution | ~1-2s |
| **Total (cached images)** | **~15-20s** |

### Testcontainers Stack

| Component | Image | Version |
|-----------|-------|---------|
| testcontainers-go | - | v0.40.0 |
| PostgreSQL | postgres:16-alpine | 16 |
| Liquibase | liquibase/liquibase:4.30-alpine | 4.30 |

### Writing New Integration Tests

1. Add build tag at the top of the file:
   ```go
   //go:build integration

   package postgres_test
   ```

2. Use `getTestPool(t)` to get the database connection:
   ```go
   func TestMyRepo_Operation(t *testing.T) {
       pool := getTestPool(t)
       repo := postgres.NewMyRepository(pool)
       ctx := context.Background()

       // Test logic...

       defer cleanup(t, pool, id) // Always clean up
   }
   ```

3. Generate valid UUIDs with `testUUID()`:
   ```go
   entity := &entity.MyEntity{
       ID:   testUUID(),
       Name: "Test Entity",
   }
   ```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot connect to Docker daemon` | Ensure Docker Desktop is running |
| `Timeout waiting for container` | Increase timeout or check Docker resources |
| `Liquibase migration failed` | Check `db/changelog.master.xml` syntax |
| `Tests skipped` | Verify Docker is running and accessible |

## Role-Based Access Control

Workspace roles hierarchy (highest to lowest):

| Role | Weight | Permissions |
|------|--------|-------------|
| OWNER | 50 | Full control |
| ADMIN | 40 | Manage members, settings |
| EDITOR | 30 | Create/edit templates |
| OPERATOR | 20 | Generate documents |
| VIEWER | 10 | Read-only access |

For a complete authorization matrix with all endpoints, roles (System, Tenant, Workspace), and required headers, see **[authorization-matrix.md](authorization-matrix.md)**.

## License

MIT
