# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Liquibase database migration project** for a Document Assembly System - a multi-tenant document template builder that delegates digital signature to external providers (PandaDoc, Documenso, DocuSign).

**Database**: PostgreSQL with extensions `pgcrypto` (UUIDs) and `pg_trgm` (fuzzy search)

## Common Commands

```bash
# Apply all pending migrations
liquibase --defaults-file=liquibase-local.properties update

# Rollback last N changesets
liquibase --defaults-file=liquibase-local.properties rollback-count N

# Generate SQL preview without executing
liquibase --defaults-file=liquibase-local.properties update-sql

# Check migration status
liquibase --defaults-file=liquibase-local.properties status
```

## Architecture

### Schema Organization (5 schemas)

| Schema | Purpose |
|--------|---------|
| `tenancy` | Multi-tenant infrastructure (tenants, workspaces) |
| `identity` | Shadow users and workspace membership |
| `organizer` | Resource classification (folders, tags, cache tables) |
| `content` | Template engine (templates, injectables, signer roles) |
| `execution` | Generated documents and signature tracking |

### Migration Phases (in changelog.master.xml)

1. **Extensions/Types**: PostgreSQL extensions and ENUMs
2. **Schema Creation**: All 5 schema definitions
3. **Tenancy Tables**: tenants, workspaces (base of all relationships)
4. **Identity Tables**: users, workspace_members
5. **Organizer Tables**: folders, tags
6. **Content Tables**: templates, injectable_definitions, template_injectables, template_signer_roles, template_tags
7. **Execution Tables**: documents, document_recipients
8. **Cache Tables**: workspace_tags_cache (trigger-maintained)

### Changeset ID Convention

```
{table}:{operation}[:{specification}]
```

Examples:
- `tenants:table_creation`
- `tenants:index_creation:code`
- `tenants:add_fk_constraint:workspace_id`
- `tenants:trigger:updated_at`

### Key Patterns

- **All UUIDs**: Use `gen_random_uuid()` from pgcrypto
- **Timestamps**: Use `TIMESTAMPTZ` with `CURRENT_TIMESTAMP` default for `created_at`
- **Auto-update triggers**: All tables with `updated_at` have `update_updated_at_column()` trigger
- **Trigram indexes**: Use `gin_trgm_ops` for fuzzy text search (names, titles)
- **PL/pgSQL functions**: Use `splitStatements="false"` in `<sql>` tags for dollar-quoted functions

### Multi-Tenant Hierarchy

```
Global (tenant_id = NULL)
  └── SYSTEM Workspace (shared templates)

Tenant (e.g., Chile, Mexico)
  ├── SYSTEM Workspace (localized templates)
  └── CLIENT Workspaces (end-user workspaces)
```

## File Structure

```
changelog.master.xml          # Master orchestrator
liquibase-*.properties        # Environment configs
src/
  extensions.xml              # pgcrypto, pg_trgm, utility functions
  types/enums.xml             # All ENUM definitions
  {schema}/
    schema.xml                # CREATE SCHEMA
    {table}.xml               # Table, FKs, indexes, triggers
```

## Documentation

See `DATABASE.md` for complete schema documentation including:
- ER diagrams (Mermaid)
- Table reference with all columns, constraints, indexes
- ENUM type definitions
- Usage examples
