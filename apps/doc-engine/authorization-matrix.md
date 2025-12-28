# Matriz de Permisos por Endpoint

## Resumen del Sistema de Roles

El sistema tiene **3 niveles de roles** jerárquicos:

1. **SystemRole** (nivel plataforma): `SUPERADMIN` > `PLATFORM_ADMIN`
2. **TenantRole** (nivel tenant): `TENANT_OWNER` > `TENANT_ADMIN`
3. **WorkspaceRole** (nivel workspace): `OWNER` > `ADMIN` > `EDITOR` > `OPERATOR` > `VIEWER`

### Headers Requeridos

| Header | Descripción |
|--------|-------------|
| `Authorization` | `Bearer <JWT_token>` - Requerido para todos los endpoints autenticados |
| `X-Tenant-ID` | UUID del tenant - Requerido para rutas `/tenant/*` |
| `X-Workspace-ID` | UUID del workspace - Requerido para rutas `/workspace/*` y `/content/*` |
| `X-Operation-ID` | UUID de operación (opcional, se genera automáticamente) |

### Elevación Automática de Roles

- `SUPERADMIN` obtiene acceso `OWNER` a cualquier workspace automáticamente
- `SUPERADMIN` obtiene acceso `TENANT_OWNER` a cualquier tenant automáticamente
- `TENANT_OWNER` obtiene acceso `ADMIN` a workspaces dentro de su tenant

---

## Tabla 1: Endpoints de Sistema (SystemRole)

- **Ruta base**: `/api/v1/system`
- **Headers requeridos**: `Authorization`
- **NO requiere**: `X-Tenant-ID`, `X-Workspace-ID`

| Método | Endpoint | Descripción | SUPERADMIN | PLATFORM_ADMIN |
|--------|----------|-------------|:----------:|:--------------:|
| GET | `/system/tenants` | Lista todos los tenants de la plataforma | ✅ | ✅ |
| POST | `/system/tenants` | Crea un nuevo tenant | ✅ | ❌ |
| GET | `/system/tenants/{tenantId}` | Obtiene información de un tenant específico | ✅ | ✅ |
| PUT | `/system/tenants/{tenantId}` | Actualiza la información de un tenant | ✅ | ✅ |
| DELETE | `/system/tenants/{tenantId}` | Elimina un tenant y todos sus datos | ✅ | ❌ |
| POST | `/system/workspaces` | Crea un workspace global del sistema (sin tenant) | ✅ | ❌ |
| POST | `/system/tenants/{tenantId}/system-workspace` | Crea un workspace de sistema para un tenant específico | ✅ | ❌ |
| GET | `/system/users` | Lista usuarios con roles de sistema asignados | ✅ | ❌ |
| POST | `/system/users/{userId}/role` | Asigna un rol de sistema a un usuario | ✅ | ❌ |
| DELETE | `/system/users/{userId}/role` | Revoca el rol de sistema de un usuario | ✅ | ❌ |

**Archivo fuente**: `internal/adapters/primary/http/controller/admin_controller.go`

---

## Tabla 2: Endpoints de Tenant (TenantRole)

- **Ruta base**: `/api/v1/tenant`
- **Headers requeridos**: `Authorization`, `X-Tenant-ID`
- **NO requiere**: `X-Workspace-ID`

| Método | Endpoint | Descripción | TENANT_OWNER | TENANT_ADMIN |
|--------|----------|-------------|:------------:|:------------:|
| GET | `/tenant` | Obtiene información del tenant actual | ✅ | ✅ |
| PUT | `/tenant` | Actualiza la información del tenant actual | ✅ | ❌ |
| GET | `/tenant/workspaces` | Lista todos los workspaces del tenant | ✅ | ✅ |
| GET | `/tenant/my-workspaces` | Lista los workspaces a los que el usuario tiene acceso en el tenant | ✅ | ✅ |
| POST | `/tenant/workspaces` | Crea un nuevo workspace en el tenant | ✅ | ❌ |
| DELETE | `/tenant/workspaces/{workspaceId}` | Elimina (archiva) un workspace del tenant | ✅ | ❌ |
| GET | `/tenant/members` | Lista todos los miembros del tenant | ✅ | ✅ |
| POST | `/tenant/members` | Agrega un usuario como miembro del tenant | ✅ | ❌ |
| GET | `/tenant/members/{memberId}` | Obtiene información de un miembro específico | ✅ | ✅ |
| PUT | `/tenant/members/{memberId}` | Actualiza el rol de un miembro del tenant | ✅ | ❌ |
| DELETE | `/tenant/members/{memberId}` | Elimina un miembro del tenant | ✅ | ❌ |

**Archivo fuente**: `internal/adapters/primary/http/controller/tenant_controller.go`

---

## Tabla 3: Endpoints de Workspace y Content (WorkspaceRole)

- **Headers requeridos**: `Authorization`, `X-Workspace-ID`
- **NO requiere**: `X-Tenant-ID`

### Lógica de Roles

| Rol | Peso | Responsabilidad |
|-----|------|-----------------|
| OWNER | 50 | Gestión completa del workspace, miembros y configuración |
| ADMIN | 40 | Administración de contenido, publicación y estructura |
| EDITOR | 30 | Crear y editar contenido (templates, injectables, folders, tags) |
| OPERATOR | 20 | Usar templates para generar documentos (solo lectura de contenido) |
| VIEWER | 10 | Solo lectura |

### Endpoints de Workspace (`/api/v1/workspace`)

| Método | Endpoint | Descripción | OWNER | ADMIN | EDITOR | OPERATOR | VIEWER |
|--------|----------|-------------|:-----:|:-----:|:------:|:--------:|:------:|
| GET | `/workspace` | Obtiene información del workspace actual | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/workspace` | Actualiza la información del workspace | ✅ | ✅ | ❌ | ❌ | ❌ |
| DELETE | `/workspace` | Archiva el workspace actual | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET | `/workspace/members` | Lista todos los miembros del workspace | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST | `/workspace/members` | Invita un usuario al workspace | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET | `/workspace/members/{memberId}` | Obtiene información de un miembro | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/workspace/members/{memberId}` | Actualiza el rol de un miembro | ✅ | ❌ | ❌ | ❌ | ❌ |
| DELETE | `/workspace/members/{memberId}` | Elimina un miembro del workspace | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET | `/workspace/folders` | Lista todas las carpetas del workspace | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET | `/workspace/folders/tree` | Obtiene el árbol jerárquico de carpetas | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST | `/workspace/folders` | Crea una nueva carpeta | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET | `/workspace/folders/{folderId}` | Obtiene información de una carpeta | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/workspace/folders/{folderId}` | Actualiza una carpeta | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH | `/workspace/folders/{folderId}/move` | Mueve una carpeta a otro padre | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/workspace/folders/{folderId}` | Elimina una carpeta | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET | `/workspace/tags` | Lista todas las etiquetas del workspace | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST | `/workspace/tags` | Crea una nueva etiqueta | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET | `/workspace/tags/{tagId}` | Obtiene información de una etiqueta | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/workspace/tags/{tagId}` | Actualiza una etiqueta | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/workspace/tags/{tagId}` | Elimina una etiqueta | ✅ | ✅ | ❌ | ❌ | ❌ |

**Archivo fuente**: `internal/adapters/primary/http/controller/workspace_controller.go`

### Endpoints de Injectables (`/api/v1/content/injectables`)

| Método | Endpoint | Descripción | OWNER | ADMIN | EDITOR | OPERATOR | VIEWER |
|--------|----------|-------------|:-----:|:-----:|:------:|:--------:|:------:|
| GET | `/content/injectables` | Lista todas las definiciones de injectables | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST | `/content/injectables` | Crea una nueva definición de injectable | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET | `/content/injectables/{injectableId}` | Obtiene una definición de injectable | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/content/injectables/{injectableId}` | Actualiza una definición de injectable | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/content/injectables/{injectableId}` | Elimina una definición de injectable | ✅ | ✅ | ❌ | ❌ | ❌ |

**Archivo fuente**: `internal/adapters/primary/http/controller/content_injectable_controller.go`

### Endpoints de Templates (`/api/v1/content/templates`)

| Método | Endpoint | Descripción | OWNER | ADMIN | EDITOR | OPERATOR | VIEWER |
|--------|----------|-------------|:-----:|:-----:|:------:|:--------:|:------:|
| GET | `/content/templates` | Lista todos los templates con filtros opcionales | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST | `/content/templates` | Crea un nuevo template con versión draft inicial | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET | `/content/templates/{templateId}` | Obtiene un template con detalles de versión publicada | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET | `/content/templates/{templateId}/all-versions` | Obtiene un template con todas sus versiones | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/content/templates/{templateId}` | Actualiza los metadatos del template | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/content/templates/{templateId}` | Elimina un template y todas sus versiones | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST | `/content/templates/{templateId}/clone` | Clona un template desde su versión publicada | ✅ | ✅ | ✅ | ❌ | ❌ |
| POST | `/content/templates/{templateId}/tags` | Agrega etiquetas a un template | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/content/templates/{templateId}/tags/{tagId}` | Elimina una etiqueta de un template | ✅ | ✅ | ✅ | ❌ | ❌ |

**Archivo fuente**: `internal/adapters/primary/http/controller/content_template_controller.go`

### Endpoints de Template Versions (`/api/v1/content/templates/{templateId}/versions`)

| Método | Endpoint | Descripción | OWNER | ADMIN | EDITOR | OPERATOR | VIEWER |
|--------|----------|-------------|:-----:|:-----:|:------:|:--------:|:------:|
| GET | `/versions` | Lista todas las versiones de un template | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST | `/versions` | Crea una nueva versión del template | ✅ | ✅ | ✅ | ❌ | ❌ |
| POST | `/versions/from-existing` | Crea una versión copiando contenido de otra existente | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET | `/versions/{versionId}` | Obtiene una versión con todos sus detalles | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT | `/versions/{versionId}` | Actualiza una versión (solo drafts) | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/versions/{versionId}` | Elimina una versión draft | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST | `/versions/{versionId}/publish` | Publica una versión draft | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST | `/versions/{versionId}/archive` | Archiva una versión publicada | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST | `/versions/{versionId}/schedule-publish` | Programa una publicación futura | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST | `/versions/{versionId}/schedule-archive` | Programa un archivado futuro | ✅ | ✅ | ❌ | ❌ | ❌ |
| DELETE | `/versions/{versionId}/schedule` | Cancela una acción programada | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST | `/versions/{versionId}/injectables` | Agrega un injectable a la versión | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/versions/{versionId}/injectables/{injectableId}` | Elimina un injectable de la versión | ✅ | ✅ | ✅ | ❌ | ❌ |
| POST | `/versions/{versionId}/signer-roles` | Agrega un rol de firmante a la versión | ✅ | ✅ | ✅ | ❌ | ❌ |
| PUT | `/versions/{versionId}/signer-roles/{roleId}` | Actualiza un rol de firmante | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE | `/versions/{versionId}/signer-roles/{roleId}` | Elimina un rol de firmante de la versión | ✅ | ✅ | ✅ | ❌ | ❌ |

**Archivo fuente**: `internal/adapters/primary/http/controller/template_version_controller.go`

### Resumen de Roles Mínimos por Operación

| Operación | Rol Mínimo |
|-----------|------------|
| Lectura (GET) | VIEWER |
| Crear contenido (POST templates/versions/injectables) | EDITOR |
| Editar contenido (PUT templates/versions/injectables) | EDITOR |
| Eliminar contenido | ADMIN |
| Publicar/Archivar versiones | ADMIN |
| Gestionar carpetas/tags | EDITOR (crear/editar), ADMIN (eliminar) |
| Gestionar miembros | ADMIN (invitar/eliminar), OWNER (cambiar roles) |
| Configuración workspace | ADMIN (editar), OWNER (archivar) |

---

## Tabla 4: Endpoints sin Contexto (Solo Auth)

**Headers requeridos**: `Authorization`
**NO requiere**: `X-Tenant-ID`, `X-Workspace-ID`

| Método | Endpoint | Descripción | Cualquier usuario autenticado |
|--------|----------|-------------|:-----------------------------:|
| GET | `/me/tenants` | Lista los tenants a los que pertenece el usuario actual | ✅ |
| GET | `/me/roles` | Obtiene los roles del usuario actual (ver detalles abajo) | ✅ |

### Endpoint `/me/roles` - Detalle

Este endpoint retorna los roles del usuario autenticado de forma condicional:

| Header | Comportamiento |
|--------|----------------|
| *(ninguno)* | Retorna solo el rol de sistema si existe |
| `X-Tenant-ID` | Agrega el rol del tenant si el usuario es miembro |
| `X-Workspace-ID` | Agrega el rol del workspace si el usuario es miembro |

**Ejemplo de respuesta:**
```json
{
  "roles": [
    { "type": "SYSTEM", "role": "SUPERADMIN", "resourceId": null },
    { "type": "TENANT", "role": "TENANT_OWNER", "resourceId": "uuid-tenant" },
    { "type": "WORKSPACE", "role": "ADMIN", "resourceId": "uuid-workspace" }
  ]
}
```

**Notas:**
- Si el usuario no tiene roles asignados, retorna `{"roles": []}`
- Si el usuario no es miembro del tenant/workspace indicado, ese rol no se incluye (sin error)
- Los headers `X-Tenant-ID` y `X-Workspace-ID` son opcionales e independientes

**Archivo fuente**: `internal/adapters/primary/http/controller/me_controller.go`

---

## Endpoints Públicos (Sin Auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Verifica que el servicio está corriendo |
| GET | `/ready` | Verifica que el servicio está listo para recibir tráfico |
| GET | `/api/v1/ping` | Endpoint de prueba de conectividad de la API |

---

## Archivos de Middleware

| Archivo | Descripción |
|---------|-------------|
| `internal/adapters/primary/http/middleware/jwt_auth.go` | Valida tokens JWT usando JWKS de Keycloak |
| `internal/adapters/primary/http/middleware/identity_context.go` | Obtiene el ID del usuario de la base de datos por email |
| `internal/adapters/primary/http/middleware/system_context.go` | Carga rol de sistema del usuario (opcional) |
| `internal/adapters/primary/http/middleware/tenant_context.go` | Valida X-Tenant-ID y carga rol de tenant |
| `internal/adapters/primary/http/middleware/role_authorization.go` | Autoriza acceso basado en roles de workspace |
