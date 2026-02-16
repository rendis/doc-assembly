# Authentication Guide

## Overview

doc-engine supports multiple authentication modes for different use cases:

| Mode | When | Auth Middleware | Identity Lookup |
|------|------|----------------|-----------------|
| **Panel OIDC** | Production (web UI) | `PanelAuth` | Yes (DB) |
| **Render OIDC** | Production (API rendering) | `RenderAuth` | No |
| **Custom Render** | External auth provider | `CustomRenderAuth` | No |
| **Dummy** | Development (no Keycloak) | `DummyAuth` | No |

---

## Architecture

### Auth Config Structure

```yaml
auth:
  panel:                              # Panel provider (login/UI)
    name: keycloak
    discovery_url: https://kc.example.com/realms/myrealm
    issuer: https://kc.example.com/realms/myrealm
    jwks_url: https://kc.example.com/realms/myrealm/protocol/openid-connect/certs
    audience: doc-engine
    client_id: doc-engine-frontend
  render_providers:                   # Additional render-only providers
    - name: external-idp
      discovery_url: https://auth.partner.com
      issuer: https://auth.partner.com
      jwks_url: https://auth.partner.com/.well-known/jwks.json
```

### Key Files

| File | Purpose |
|------|---------|
| `middleware/jwt_auth.go` | Multi-OIDC token validation (PanelAuth, RenderAuth, MultiOIDCAuth) |
| `middleware/dummy_auth.go` | Dev mode bypass (DummyAuth, DummyIdentityAndRoles) |
| `middleware/custom_render_auth.go` | Extensible custom auth for render endpoints |
| `middleware/identity_context.go` | User sync from IdP to DB (IdentityContext) |
| `middleware/system_context.go` | System role loading (SystemRoleContext) |
| `config/discovery.go` | OIDC Discovery (auto-populate from `.well-known`) |
| `config/types.go` | AuthConfig, OIDCProvider, CORSConfig |
| `port/render_authenticator.go` | RenderAuthenticator interface |

---

## Flow 1: Panel Authentication (Production)

Used for all web UI routes (`/api/v1/*`). Full identity lookup with DB user sync.

```
                                    PANEL AUTH FLOW
                                    ══════════════

  Browser                    Gin Middleware Chain                    Database
  ═══════                    ═══════════════════                    ════════

  ┌─────────┐
  │ Request  │──── Authorization: Bearer <JWT> ────┐
  │ with JWT │     X-Tenant-ID: <uuid>             │
  │          │     X-Workspace-ID: <uuid>          │
  └─────────┘                                      ▼
                                         ┌──────────────────┐
                                         │   Operation()    │
                                         │ Generate op ID   │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │  RequestTimeout  │
                                         │  (28s default)   │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │   PanelAuth()    │
                                         │                  │
                                         │ 1. Extract token │
                                         │ 2. Peek issuer   │
                                         │ 3. Match provider│
                                         │ 4. Validate JWKS │
                                         │ 5. Store claims  │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐       ┌─────────┐
                                         │IdentityContext() │──────▶│ users   │
                                         │                  │       │ table   │
                                         │ 1. Get email     │◀──────│         │
                                         │ 2. Find/create   │       └─────────┘
                                         │    user in DB    │
                                         │ 3. Set internal  │
                                         │    user ID       │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐       ┌─────────────┐
                                         │SystemRoleContext()│──────▶│system_roles │
                                         │                  │       │   table     │
                                         │ Load SUPERADMIN  │◀──────│             │
                                         │ or PLATFORM_ADMIN│       └─────────────┘
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │   Controller     │
                                         │  (handler)       │
                                         └──────────────────┘
```

### Token Validation Detail (MultiOIDCAuth)

```
  ┌───────────────────────────────────────────────────────────────┐
  │                    MultiOIDCAuth Flow                         │
  │                                                               │
  │  Token ──▶ Extract Bearer ──▶ Peek Issuer (no validation)    │
  │                                      │                        │
  │                                      ▼                        │
  │                              ┌───────────────┐                │
  │                              │ Provider Map  │                │
  │                              │ (by issuer)   │                │
  │                              └───┬───────┬───┘                │
  │                            found │       │ not found          │
  │                                  ▼       ▼                    │
  │                           ┌──────────┐ ┌───────┐              │
  │                           │ Validate │ │  401  │              │
  │                           │ w/ JWKS  │ │Unknown│              │
  │                           └──┬───┬───┘ │Issuer │              │
  │                         ok   │   │fail └───────┘              │
  │                              ▼   ▼                            │
  │                        ┌────────┐ ┌───────┐                   │
  │                        │ Store  │ │  401  │                   │
  │                        │ Claims │ │Invalid│                   │
  │                        └────────┘ └───────┘                   │
  └───────────────────────────────────────────────────────────────┘
```

---

## Flow 2: Render Authentication (Production)

Used for render endpoints (`/api/v1/render/*`). Stateless — no DB identity lookup.
Accepts tokens from panel provider AND any render-only providers.

```
                                  RENDER AUTH FLOW
                                  ════════════════

  External                   Gin Middleware Chain
  Service                    ═══════════════════
  ═══════

  ┌─────────┐
  │ Request  │──── Authorization: Bearer <JWT> ────┐
  │ with JWT │                                     │
  └─────────┘                                      ▼
                                         ┌──────────────────┐
                                         │   Operation()    │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │  RequestTimeout  │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │  RenderAuth()    │
                                         │                  │
                                         │ Validates against│
                                         │ ALL providers:   │
                                         │  - panel         │
                                         │  - render_only[] │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │RenderClaimsCtx() │
                                         │                  │
                                         │ Pass-through     │
                                         │ (no DB lookup)   │
                                         └────────┬─────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │   Controller     │
                                         └──────────────────┘
```

**Key difference from Panel**: No `IdentityContext` or `SystemRoleContext` middleware. The render endpoint operates statelessly using only JWT claims.

---

## Flow 3: Custom Render Authentication

Used when a custom `RenderAuthenticator` implementation is registered.
Allows external auth providers (e.g., API tokens, custom JWT) for render endpoints.

```
                              CUSTOM RENDER AUTH FLOW
                              ══════════════════════

  External                   Gin Middleware Chain              Custom Auth
  Service                    ═══════════════════              ═══════════
  ═══════

  ┌─────────┐
  │ Request  │──── Authorization: Bearer <token> ───┐
  │          │                                      │
  └─────────┘                                       ▼
                                         ┌──────────────────┐
                                         │CustomRenderAuth()│
                                         │                  │
                                         │ 1. Call custom   │──────▶ ┌──────────────┐
                                         │    Authenticate  │        │ Your custom  │
                                         │                  │◀────── │ auth logic   │
                                         │ 2. Store claims  │        │ (API verify, │
                                         │    in context    │        │  decode JWT, │
                                         │                  │        │  etc.)       │
                                         └────────┬─────────┘        └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │   Controller     │
                                         └──────────────────┘
```

### RenderAuthenticator Interface

```go
// port/render_authenticator.go
type RenderAuthenticator interface {
    Authenticate(c *gin.Context) (*RenderAuthClaims, error)
}

type RenderAuthClaims struct {
    UserID   string
    Email    string
    Name     string
    Provider string
    Extra    map[string]any  // Custom data accessible via GetRenderAuthExtra()
}
```

---

## Flow 4: Dummy Authentication (Development)

Activated automatically when no OIDC panel provider is configured (`auth.panel` is empty).
No tokens required — injects a fixed superadmin identity.

```
                                  DUMMY AUTH FLOW
                                  ═══════════════

  Browser/                   Gin Middleware Chain
  cURL                       ═══════════════════
  ═════

  ┌─────────┐
  │ Request  │──── (no Authorization header needed) ──┐
  │          │                                        │
  └─────────┘                                         ▼
                                         ┌──────────────────────┐
                                         │    DummyAuth()       │
                                         │                      │
                                         │ Inject fixed claims: │
                                         │  user_id: 000...001  │
                                         │  email: admin@       │
                                         │    docengine.local   │
                                         │  name: Doc Engine    │
                                         │    Admin             │
                                         └────────┬─────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────────┐
                                         │DummyIdentityAndRoles│
                                         │                      │
                                         │ Inject:              │
                                         │  internal_user_id    │
                                         │  system_role:        │
                                         │    SUPERADMIN        │
                                         │                      │
                                         │ (bypasses Identity   │
                                         │  Context and System  │
                                         │  Role Context)       │
                                         └────────┬─────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────────┐
                                         │   Controller         │
                                         │ (full SUPERADMIN     │
                                         │  access)             │
                                         └──────────────────────┘
```

### Activation

Dummy auth activates when `cfg.Auth.IsDummyAuth()` returns `true`:

```go
// IsDummyAuth returns true if no OIDC providers are configured.
func (a *AuthConfig) IsDummyAuth() bool {
    return a.GetPanelOIDC() == nil
}
```

To use dummy auth: leave all `DOC_ENGINE_AUTH_*` environment variables empty.

---

## Flow 5: OIDC Discovery

Runs at application startup during config load. Fetches provider configuration
from `/.well-known/openid-configuration` endpoints.

```
                               OIDC DISCOVERY FLOW
                               ════════════════════

  App Startup                     config.Load()                  OIDC Provider
  ═══════════                     ═════════════                  ═════════════

  ┌──────────┐
  │ Load     │
  │ config   │──── Read app.yaml ────┐
  │          │                       │
  └──────────┘                       ▼
                            ┌──────────────────┐
                            │  Unmarshal YAML  │
                            │  into Config     │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ DiscoverAll()    │
                            │                  │
                            │ For each provider│
                            │ with discovery_  │
                            │ url set:         │
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐        ┌─────────────────┐
                            │ discoverOIDC()   │──GET──▶│/.well-known/    │
                            │                  │        │openid-          │
                            │ Fetch discovery  │◀─JSON──│configuration    │
                            │ document         │        └─────────────────┘
                            └────────┬─────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ Populate fields  │
                            │ (if not already  │
                            │  configured):    │
                            │                  │
                            │  - issuer        │
                            │  - jwks_url      │
                            │  - token_endpoint│
                            │  - userinfo_ep   │
                            │  - end_session_ep│
                            └──────────────────┘
```

### Discovery Behavior

- **Non-fatal**: If discovery fails, a warning is logged but the app continues
- **Manual override**: If `issuer`/`jwks_url` are already set in config, discovery won't overwrite them
- **Timeout**: Each discovery request has a 10-second timeout
- **URL normalization**: `discovery_url` is automatically suffixed with `/.well-known/openid-configuration` if not present

---

## Route Groups & Auth Summary

```
                        HTTP SERVER ROUTE STRUCTURE
                        ══════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │                         GIN ENGINE                              │
  │                                                                 │
  │  Global: Recovery → Logger → CORS                               │
  │                                                                 │
  │  ┌─────────────────────────────────────────────────────────┐    │
  │  │ /health, /ready               (no auth)                 │    │
  │  │ /api/v1/config                (no auth, client config)  │    │
  │  │ /swagger/*                    (no auth, if enabled)     │    │
  │  └─────────────────────────────────────────────────────────┘    │
  │                                                                 │
  │  ┌─────────────────────────────────────────────────────────┐    │
  │  │ /api/v1/* (Internal)          API Key auth              │    │
  │  │   └─ /documents/generate      (service-to-service)      │    │
  │  └─────────────────────────────────────────────────────────┘    │
  │                                                                 │
  │  ┌─────────────────────────────────────────────────────────┐    │
  │  │ /api/v1/* (Panel)                                       │    │
  │  │                                                         │    │
  │  │   Auth: DummyAuth OR PanelAuth + Identity + SystemRole  │    │
  │  │                                                         │    │
  │  │   /ping                       (authenticated)           │    │
  │  │   /admin/*                    (SUPERADMIN/PLATFORM_ADMIN)│    │
  │  │   /me/*                       (authenticated)           │    │
  │  │   /tenants/*                  (TENANT_OWNER/ADMIN)      │    │
  │  │   /workspaces/*               (workspace roles)         │    │
  │  │   /templates/*                (workspace roles)         │    │
  │  │   /injectables/*              (workspace roles)         │    │
  │  └─────────────────────────────────────────────────────────┘    │
  │                                                                 │
  │  ┌─────────────────────────────────────────────────────────┐    │
  │  │ /api/v1/render/* (Render)                               │    │
  │  │                                                         │    │
  │  │   Auth: DummyAuth OR CustomRenderAuth OR RenderAuth     │    │
  │  │   (no DB identity lookup — stateless)                   │    │
  │  │                                                         │    │
  │  │   (routes to be added)                                  │    │
  │  └─────────────────────────────────────────────────────────┘    │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Client Config Endpoint

`GET /api/v1/config` (no auth required)

Returns non-sensitive OIDC configuration for the frontend:

```json
{
  "dummyAuth": false,
  "panelProvider": {
    "name": "keycloak",
    "issuer": "https://kc.example.com/realms/myrealm",
    "tokenEndpoint": "https://kc.example.com/realms/myrealm/protocol/openid-connect/token",
    "userinfoEndpoint": "https://kc.example.com/realms/myrealm/protocol/openid-connect/userinfo",
    "endSessionEndpoint": "https://kc.example.com/realms/myrealm/protocol/openid-connect/logout",
    "clientId": "doc-engine-frontend"
  }
}
```

In dummy auth mode:

```json
{
  "dummyAuth": true,
  "panelProvider": null
}
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DOC_ENGINE_AUTH_DISCOVERY_URL` | OIDC discovery endpoint (auto-populates other fields) | No* |
| `DOC_ENGINE_AUTH_ISSUER` | Expected JWT issuer claim | Yes** |
| `DOC_ENGINE_AUTH_JWKS_URL` | JWKS endpoint for token validation | Yes** |
| `DOC_ENGINE_AUTH_AUDIENCE` | Expected JWT audience claim | No |
| `DOC_ENGINE_AUTH_CLIENT_ID` | OIDC client ID for frontend | No |

\* If `discovery_url` is set, `issuer` and `jwks_url` are auto-populated via discovery.
\** Required for OIDC mode. If all auth vars are empty, app runs in dummy auth mode.

---

## Testing

Integration tests use `parseUnverifiedToken` mode (empty `AuthConfig`):

```go
// testhelper/server.go
authCfg := &config.AuthConfig{}  // Empty = no JWKS, uses ParseUnverified
v1.Use(middleware.MultiOIDCAuth(authCfg.GetAllOIDCProviders()))
```

Test tokens are created with `GenerateTestToken(email, name)` — signed with HS256 but
validated without signature check (ParseUnverified mode).
