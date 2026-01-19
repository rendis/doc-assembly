# AGENTS.md

This file provides guidance to AI Agents when working with this monorepo.

## Project Overview

**doc-assembly** is a multi-tenant document template builder with digital signature delegation to external providers (PandaDoc, Documenso, DocuSign).

**Stack**: Go 1.25 + React 19 + PostgreSQL 16 + Keycloak

## Monorepo Structure

```plaintext
apps/
  doc-engine/    → Go backend (Hexagonal Architecture, Gin, Wire DI)
  web-client/    → React SPA (TanStack Router, Zustand, TipTap)
db/              → Liquibase migrations (PostgreSQL)
```

## Component AGENTS.md

Each component has detailed agent instructions. **Read before working on that component.**

| Component | Path | When to Read |
| --------- | ---- | ------------ |
| Backend | `apps/doc-engine/AGENTS.md` | Modifying Go code, adding endpoints, services, repos, or running backend tests |
| Frontend | `apps/web-client/AGENTS.md` | Modifying React components, routes, state, or UI styling |
| Database | `db/AGENTS.md` | Creating/modifying migrations, understanding schema structure |

## Quick Start

### Requirements

- Go 1.25+
- Node 22+ with pnpm
- Docker (for PostgreSQL, integration tests)
- Liquibase CLI

### Start Order: DB → Backend → Frontend

```bash
# 1. Database (Docker + migrations)
cd db
docker compose up -d postgres
liquibase --defaults-file=liquibase-local.properties update

# 2. Backend
cd apps/doc-engine
make build && make run

# 3. Frontend
cd apps/web-client
pnpm install && pnpm dev
```

## Development Workflow

### Common Commands by Component

| Action  | Backend      | Frontend     | Database           |
| ------- | ------------ | ------------ | ------------------ |
| Build   | `make build` | `pnpm build` | N/A                |
| Dev     | `make dev`   | `pnpm dev`   | N/A                |
| Test    | `make test`  | `pnpm test`  | N/A                |
| Lint    | `make lint`  | `pnpm lint`  | N/A                |
| Migrate | N/A          | N/A          | `liquibase update` |

### Backend-Specific

```bash
make wire      # Regenerate DI
make swagger   # Regenerate OpenAPI spec
make gen       # Both wire + swagger
make test-integration  # E2E tests (requires Docker)
```

## Cross-Component Patterns

### Multi-Tenant Headers

All API requests require:

- `X-Tenant-ID`: UUID of current tenant
- `X-Workspace-ID`: UUID of current workspace
- `Authorization`: Bearer JWT token

Frontend auto-attaches these via `api-client.ts`.

### RBAC System

Three role levels:

1. **System**: SUPERADMIN (global access)
2. **Tenant**: OWNER, ADMIN
3. **Workspace**: OWNER, ADMIN, EDITOR, OPERATOR, VIEWER

See `apps/doc-engine/docs/authorization-matrix.md` for endpoint permissions.

### Environment Variables

| Component | Prefix         | Example                    |
| --------- | -------------- | -------------------------- |
| Backend   | `DOC_ENGINE_*` | `DOC_ENGINE_DATABASE_HOST` |
| Frontend  | `VITE_*`       | `VITE_API_URL`             |

### Error Handling

- Backend returns structured errors with codes
- Frontend processes via axios interceptors in `api-client.ts`

### Logging

- Backend: `log/slog` with context-aware logging
- Always use `slog.InfoContext(ctx, ...)` not `slog.Info(...)`

## Key Documentation

| Document             | Path                                           | Content                      |
| -------------------- | ---------------------------------------------- | ---------------------------- |
| Authorization Matrix | `apps/doc-engine/docs/authorization-matrix.md` | Endpoint permissions by role |
| Database Schema      | `db/DATABASE.md`                               | ER diagrams, table reference |
| Extensibility Guide  | `apps/doc-engine/docs/extensibility-guide.md`  | Custom injectors/mappers     |
| Go Best Practices    | `apps/doc-engine/docs/go-best-practices.md`    | Coding standards             |
| Design System        | `apps/web-client/docs/design_system.md`        | UI patterns, colors          |
| Architecture         | `apps/web-client/docs/architecture.md`         | Frontend patterns            |

## Available Skills

Skills are specialized commands that automate common workflows. Invoke with `/skill-name`.

| Skill | When to Use |
| ----- | ----------- |
| **feature-dev** | New features touching multiple files/layers; want architecture-first approach |
| **commit** | Create a git commit with proper message |
| **commit-push-pr** | Commit, push branch, and open PR in one step |
| **code-review** | Review a PR for bugs, security, code quality |
| **frontend-design** | Create production-grade UI components with high design quality |
| **agent-browser** | Web testing, form filling, screenshots, data extraction |
| **web-design-guidelines** | Audit UI for accessibility, UX best practices |
| **vercel-react-best-practices** | Optimize React/Next.js performance |
| **clean_gone** | Remove local branches deleted on remote |

### On-Demand Agents

These agents are invoked by requesting them directly (not with `/`).

| Agent | When to Use |
| ----- | ----------- |
| **code-simplifier** | Simplify/refactor code for clarity and maintainability; after completing a feature; reduce complexity without changing behavior |

## PR Guidelines

Before submitting:

1. Run `make build && make test && make lint` in `apps/doc-engine/`
2. Run `pnpm build && pnpm lint` in `apps/web-client/`
3. Verify integration tests compile: `go build -tags=integration ./...`
4. Update relevant documentation if changing APIs or schemas

## Common Pitfalls

### Backend

- Forgetting `make wire` after adding new services/repos
- Not reading files before suggesting changes
- Missing `-tags=integration` when testing integration code
- Modifying DB schema directly (suggest only, never apply)

### Frontend

- Not checking `authorization-matrix.md` before implementing permissions
- Using `slog.Info()` instead of `slog.InfoContext(ctx, ...)`
- Not consulting design system before UI changes

### Database

- Forgetting `splitStatements="false"` for PL/pgSQL functions
- Wrong changeset ID format (use `{table}:{operation}[:{spec}]`)
- Not using triggers for `updated_at` columns

### Cross-Component

- Missing multi-tenant headers in API calls
- Inconsistent error handling between layers
- Not syncing OpenAPI spec after backend changes
