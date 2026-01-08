# AGENTS.md

This file provides guidance to IA Agents when working with code in this repository.



## Commands

```bash
# Development
pnpm dev          # Start dev server (Vite with rolldown)
pnpm build        # Type-check (tsc -b) then build
pnpm lint         # ESLint for TS/TSX files
pnpm preview      # Preview production build
```

## Architecture

This is a React 19 + TypeScript SPA for a multi-tenant document assembly platform. It uses Vite (rolldown-vite) for bundling.

- **Guía completa de arquitectura**: `docs/ARCHITECTURE.md` (stack, estructura de carpetas, patrones de código, configuración)

### Routing

- **TanStack Router** with file-based routing in `src/routes/`
- Routes are auto-generated to `src/routeTree.gen.ts` by `@tanstack/router-vite-plugin`
- Root route (`__root.tsx`) enforces tenant selection before navigation

### State Management

- **Zustand** stores with persistence:
  - `auth-store.ts`: JWT token and system roles
  - `app-context-store.ts`: Current tenant and workspace context
  - `theme-store.ts`: Light/dark theme preference

### Authentication & Authorization

- **Keycloak** integration via `keycloak-js` (configurable via env vars)
- Mock auth mode: Set `VITE_USE_MOCK_AUTH=true` to bypass Keycloak
- **RBAC system** in `src/features/auth/rbac/`:
  - Three role levels: System (SUPERADMIN), Tenant (OWNER/ADMIN), Workspace (OWNER/ADMIN/EDITOR/OPERATOR/VIEWER)
  - `usePermission()` hook checks permissions against current context
  - `<PermissionGuard>` component for declarative UI permission control

### API Layer

- Axios client (`src/lib/api-client.ts`) auto-attaches:
  - `Authorization` header (Bearer token)
  - `X-Tenant-ID` and `X-Workspace-ID` headers from context
- Backend expected at `VITE_API_URL` (default: `http://localhost:8080/api/v1`)
- **Swagger/OpenAPI**: La especificación de las APIs está en `../doc-engine/docs/swagger.json`

> **IMPORTANTE para Agentes IA**: Antes de implementar o interactuar con cualquier componente de la API, **SIEMPRE** consulta el archivo Swagger (`../doc-engine/docs/swagger.json`) para obtener contexto actualizado sobre endpoints, parámetros, tipos de respuesta y modelos de datos.

### Feature Structure

Features are organized in `src/features/` with consistent structure:
- `api/` - API calls
- `components/` - Feature-specific components
- `hooks/` - Feature hooks
- `types/` - TypeScript interfaces

Current features: `auth`, `tenants`, `workspaces`, `documents`, `editor`

### Styling

- **Tailwind CSS** with shadcn/ui-style CSS variables
- Dark mode via `class` strategy
- Colors defined as HSL CSS variables in `index.css`
- **Design System**: Documentación completa en `docs/DESIGN_SYSTEM.md`

> **IMPORTANTE**: Antes de crear o modificar componentes UI, **SIEMPRE** consulta el Design System (`docs/DESIGN_SYSTEM.md`) para mantener consistencia visual. Incluye filosofía de diseño, paleta de colores, tipografía, border radius, espaciado y patrones de componentes.

### Rich Text Editor

- **TipTap** editor with StarterKit in `src/features/editor/`
- Prose styling via `@tailwindcss/typography`

### i18n

- **i18next** with browser detection
- Translation files in `public/locales/{lng}/translation.json`
- Currently supports: `en`, `es`

## Environment Variables

```
VITE_API_URL              # Backend API base URL
VITE_KEYCLOAK_URL         # Keycloak server URL
VITE_KEYCLOAK_REALM       # Keycloak realm name
VITE_KEYCLOAK_CLIENT_ID   # Keycloak client ID
VITE_USE_MOCK_AUTH        # Set to "true" to skip Keycloak (dev only)
```

## Path Aliases

`@/` maps to `./src/` (configured in vite.config.ts)
