# AGENTS.md

This file provides guidance to Agents Code when working with code in this repository.

## Project Overview

**doc-assembly** is a multi-tenant document template builder with digital signature delegation to external providers (PandaDoc, Documenso, DocuSign).

**Stack**: Go 1.25 + React 19 + PostgreSQL 16 + Keycloak

## Monorepo Structure

```
core/       → Go backend (Hexagonal Architecture, Gin, Wire DI)
app/        → React SPA (TanStack Router, Zustand, TipTap)
db/         → Liquibase migrations (PostgreSQL)
scripts/    → Tooling reutilizable por agents y CI
```

## Component AGENTS.md

Each component has its own AGENTS.md with build commands, architecture details, and coding patterns. **Always read the relevant AGENTS.md before working on that component.**

| Component | Path             | When to Read                               |
| --------- | ---------------- | ------------------------------------------ |
| Backend   | `core/AGENTS.md` | Go code, endpoints, services, repos, tests |
| Frontend  | `app/AGENTS.md`  | React components, routes, state, styling   |
| Database  | `db/AGENTS.md`   | Migrations, schema understanding           |
| Scripts   | `scripts/`       | Tooling: docml2json, etc.                  |

## Architecture (Cross-Component)

### Request Flow (Hexagonal)

```
HTTP Request
  → Middleware (JWT auth, tenant/workspace context, operation ID)
    → Controller (parse request DTO, validate)
      → UseCase interface → Service (business logic)
        → Port interface → Repository (SQL via pgx)
          → PostgreSQL
```

### Multi-Tenant Data Flow

1. Frontend Zustand stores hold current tenant/workspace selection
2. Axios interceptor in `api-client.ts` auto-attaches `Authorization`, `X-Tenant-ID`, `X-Workspace-ID` headers — never set these manually
3. Backend middleware extracts headers into request context
4. Services and repositories receive scoped context throughout the call chain

### Wire DI (Backend)

`internal/infra/di.go` defines ProviderSet → `cmd/api/wire.go` declares build → `cmd/api/wire_gen.go` auto-generated. Always run `make wire` after adding/changing services or repositories.

### Extensibility Codegen (Backend)

`//docengine:injector`, `//docengine:mapper`, `//docengine:init` markers in `internal/extensions/` → `make gen` regenerates `registry_gen.go`. Never edit `registry_gen.go` manually.

### Frontend RBAC

Permission rules defined in `src/features/auth/rbac/rules.ts`. Always use `usePermission()` hook or `<PermissionGuard>` component. Check `core/docs/authorization-matrix.md` for correct role requirements per endpoint before implementing permission checks.

### Public Signing Flow (No Auth)

Public endpoints (`/public/*`) require NO authentication. Two flows:
- **Email verification gate**: `/public/doc/{id}` → enter email → receive token via email
- **Token-based signing**: `/public/sign/{token}` → preview PDF → sign via embedded iframe

Token types: `SIGNING` (direct sign, no form) vs `PRE_SIGNING` (fill form first).
Anti-enumeration: `RequestAccess` always returns 200 regardless of email match.
Admin can invalidate all tokens via `POST /documents/{id}/invalidate-tokens`.

**Documentation**: `core/docs/public-signing-flow.md` (Mermaid diagrams, endpoints, security)

### OpenAPI Spec

When working with API contracts, prefer using `mcp__doc-engine-api__*` tools to query the swagger interactively. Fallback: read `core/docs/swagger.yaml` directly (large file, ~3000+ lines).

## Cross-Component Patterns

### Multi-Tenant Headers

All API requests require:

- `Authorization`: Bearer JWT (Keycloak)
- `X-Tenant-ID`: UUID of current tenant
- `X-Workspace-ID`: UUID of current workspace

### RBAC (Three Levels)

1. **System**: SUPERADMIN, PLATFORM_ADMIN (global)
2. **Tenant**: OWNER, ADMIN
3. **Workspace**: OWNER, ADMIN, EDITOR, OPERATOR, VIEWER

SUPERADMIN auto-elevates to OWNER in any workspace/tenant.

### Environment Variables

| Component | Prefix         | Example                    |
| --------- | -------------- | -------------------------- |
| Backend   | `DOC_ENGINE_*` | `DOC_ENGINE_DATABASE_HOST` |
| Frontend  | `VITE_*`       | `VITE_API_URL`             |

### Logging

Backend uses `log/slog` with context-aware handler. Always use `slog.InfoContext(ctx, ...)` — never `slog.Info(...)`, never inject `*slog.Logger` as dependency.

### Database Schema

Managed by Liquibase in `db/`. **Agents must NEVER modify `db/src/` files directly** — only read for context and suggest changes to the user. See `db/DATABASE.md` for full schema docs.

## PR Checklist

1. `make build && make test && make lint` in `core/`
2. `pnpm build && pnpm lint` in `app/`
3. `go build -tags=integration ./...` in `core/` (verify integration tests compile)
4. Update `authorization-matrix.md` if endpoints changed
5. Update `extensibility-guide.md` if injector/mapper interfaces changed
6. Run `make gen` if extensibility markers changed

## Common Pitfalls

### Backend

- Forgetting `make wire` after adding new services/repos
- Missing `-tags=integration` when testing integration code (not compiled by `make test`)
- Using `slog.Info()` instead of `slog.InfoContext(ctx, ...)`

### Frontend

- Not checking `authorization-matrix.md` before implementing permissions
- Not consulting `docs/design_system.md` before UI changes
- Manually setting auth/tenant headers (api-client.ts handles this)

### Database

- Forgetting `splitStatements="false"` for PL/pgSQL functions
- Wrong changeset ID format (use `{table}:{operation}[:{spec}]`)
- Not using triggers for `updated_at` columns

### Cross-Component

- Not syncing OpenAPI spec after backend changes (`make swagger`)
- Inconsistent error handling between layers

## Scripts & Tools

### docml2json — Metalanguage to PortableDocument JSON

**Path**: `scripts/docml2json/`

Converts `.docml` text files into valid PortableDocument v1.1.0 JSON importable by the editor.

```bash
python3 scripts/docml2json/docml2json.py input.docml              # → input.json
python3 scripts/docml2json/docml2json.py input.docml -o out.json   # explicit output
python3 scripts/docml2json/docml2json.py *.docml                   # batch mode
```

| File | Description |
|------|-------------|
| `docml2json.py` | Conversion script (Python 3, no dependencies) |
| `DOCML-REFERENCIA.md` | Full metalanguage syntax reference |
| `example.docml` | Complete working example with all node types |

**When to use**: Creating or bulk-generating document templates without hand-crafting ~500-1400 line JSON files. Supports paragraphs, headings, lists, tables, injectors (variables), checkboxes, signatures, marks (bold/italic/underline), alignment, page breaks, and horizontal rules.
