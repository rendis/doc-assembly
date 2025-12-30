# Portable Document Format (PDF-JSON)

Formato JSON para exportar, importar y persistir documentos del editor de contratos.

## Características

- ✅ Compatible con ProseMirror/TipTap
- ✅ Imágenes embebidas en Base64
- ✅ Metadata completa (variables, roles, página)
- ✅ Versionado para migraciones futuras
- ✅ Validación con Zod

---

## Estructura del Documento

```typescript
interface PortableDocument {
  version: string;                    // "1.1.0"
  meta: DocumentMeta;
  pageConfig: PageConfig;
  variableIds: string[];              // IDs de variables (definiciones vienen del backend)
  signerRoles: SignerRoleDefinition[];
  signingWorkflow: SigningWorkflowConfig;  // Config de orden y notificaciones
  content: ProseMirrorDocument;
  exportInfo: ExportInfo;
}
```

> **Nota importante**: Las definiciones completas de las variables (tipo, label, validaciones) se obtienen desde el backend. El documento solo almacena los IDs de las variables utilizadas.

---

## Secciones

### 1. `version`

Versión semántica del formato (MAJOR.MINOR.PATCH).

```json
"version": "1.1.0"
```

| Versión | Descripción |
|---------|-------------|
| 1.1.0   | Agregado `signingWorkflow` (orderMode, notifications) |
| 1.0.0   | Versión inicial |

---

### 2. `meta`

Metadata del documento.

```typescript
interface DocumentMeta {
  title: string;
  description?: string;
  language: 'en' | 'es';
  customFields?: Record<string, string>;
}
```

**Ejemplo:**
```json
"meta": {
  "title": "Contrato de Servicios",
  "description": "Plantilla estándar para servicios profesionales",
  "language": "es"
}
```

---

### 3. `pageConfig`

Configuración de página para renderizado e impresión.

```typescript
interface PageConfig {
  formatId: 'A4' | 'LETTER' | 'LEGAL' | 'CUSTOM';
  width: number;      // pixels @ 96 DPI
  height: number;     // pixels @ 96 DPI
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  showPageNumbers: boolean;
  pageGap: number;    // pixels entre páginas en editor
}
```

**Formatos predefinidos:**

| Formato | Dimensiones (px) | Dimensiones reales |
|---------|------------------|-------------------|
| A4      | 794 × 1123       | 210mm × 297mm     |
| LETTER  | 816 × 1056       | 8.5" × 11"        |
| LEGAL   | 816 × 1344       | 8.5" × 14"        |

**Ejemplo:**
```json
"pageConfig": {
  "formatId": "A4",
  "width": 794,
  "height": 1123,
  "margins": { "top": 96, "bottom": 96, "left": 72, "right": 72 },
  "showPageNumbers": true,
  "pageGap": 40
}
```

---

### 4. `variableIds`

IDs de las variables usadas en el documento. Las definiciones completas vienen del backend.

```typescript
// En el documento solo se guardan los IDs:
variableIds: string[];  // ["client_name", "contract_date", "total_amount"]
```

**Ejemplo:**
```json
"variableIds": ["client_name", "client_email", "contract_date", "total_amount"]
```

#### Definiciones de Variables (Backend)

Las variables se obtienen desde la API del backend:

```typescript
type VariableType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

interface BackendVariable {
  id: string;
  variableId: string;      // Clave única (lo que se guarda en el documento)
  label: string;           // Nombre visible
  type: VariableType;
  required?: boolean;
  defaultValue?: string | number | boolean;
  format?: string;         // Para DATE, CURRENCY
  validation?: {
    min?: number | string;
    max?: number | string;
    pattern?: string;
    allowedValues?: string[];
  };
}
```

#### Flujo de Variables

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Backend      │────▶│  GET /variables  │────▶│   Frontend      │
│  (source of     │     │                  │     │  (lista para    │
│   truth)        │     │                  │     │   workspace)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Documento JSON                                                 │
│  - Solo guarda: variableIds: ["client_name", "contract_date"]   │
│  - Nodos injector: { variableId: "client_name" }                │
└─────────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Al renderizar/importar:                                        │
│  1. Obtener lista de variables del backend                      │
│  2. Para cada variableId en documento → buscar en lista backend │
│  3. Si no existe → warning de variable huérfana                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. `signerRoles`

Roles de firma definidos para el documento.

```typescript
interface SignerRoleDefinition {
  id: string;
  label: string;
  name: {
    type: 'text' | 'injectable';
    value: string;  // Texto fijo o variableId
  };
  email: {
    type: 'text' | 'injectable';
    value: string;
  };
  order: number;    // Orden de firma (1-based)
}
```

**Ejemplo:**
```json
"signerRoles": [
  {
    "id": "role_1",
    "label": "Cliente",
    "name": { "type": "injectable", "value": "client_name" },
    "email": { "type": "injectable", "value": "client_email" },
    "order": 1
  },
  {
    "id": "role_2",
    "label": "Representante Legal",
    "name": { "type": "text", "value": "Juan Pérez" },
    "email": { "type": "text", "value": "legal@empresa.com" },
    "order": 2
  }
]
```

---

### 6. `signingWorkflow`

Configuración del workflow de firma, incluyendo el orden de firmas y las notificaciones.

```typescript
interface SigningWorkflowConfig {
  orderMode: 'parallel' | 'sequential';
  notifications: SigningNotificationConfig;
}

interface SigningNotificationConfig {
  scope: 'global' | 'individual';
  globalTriggers: NotificationTriggerMap;
  roleConfigs: RoleNotificationConfig[];
}

interface RoleNotificationConfig {
  roleId: string;
  triggers: NotificationTriggerMap;
}

type NotificationTriggerMap = Partial<Record<NotificationTrigger, NotificationTriggerSettings>>;

interface NotificationTriggerSettings {
  enabled: boolean;
  previousRolesConfig?: PreviousRolesConfig;  // Solo para 'on_previous_roles_signed'
}

interface PreviousRolesConfig {
  mode: 'auto' | 'custom';
  selectedRoleIds: string[];  // IDs de roles que deben firmar antes (solo en 'custom')
}

type NotificationTrigger =
  | 'on_document_created'        // Al crear documento
  | 'on_previous_roles_signed'   // Cuando firmen roles anteriores (solo secuencial)
  | 'on_turn_to_sign'            // Cuando le toque firmar (solo secuencial)
  | 'on_all_signatures_complete'; // Al completar todas las firmas
```

**Triggers por modo de orden:**

| Modo | Triggers Disponibles |
|------|---------------------|
| `parallel` | `on_document_created`, `on_all_signatures_complete` |
| `sequential` | `on_document_created`, `on_previous_roles_signed`, `on_turn_to_sign`, `on_all_signatures_complete` |

**Ejemplo (notificaciones globales):**
```json
"signingWorkflow": {
  "orderMode": "sequential",
  "notifications": {
    "scope": "global",
    "globalTriggers": {
      "on_document_created": { "enabled": false },
      "on_previous_roles_signed": {
        "enabled": false,
        "previousRolesConfig": { "mode": "auto", "selectedRoleIds": [] }
      },
      "on_turn_to_sign": { "enabled": true },
      "on_all_signatures_complete": { "enabled": false }
    },
    "roleConfigs": []
  }
}
```

**Ejemplo (notificaciones individuales por rol):**
```json
"signingWorkflow": {
  "orderMode": "sequential",
  "notifications": {
    "scope": "individual",
    "globalTriggers": {},
    "roleConfigs": [
      {
        "roleId": "role_1",
        "triggers": {
          "on_document_created": { "enabled": true },
          "on_all_signatures_complete": { "enabled": true }
        }
      },
      {
        "roleId": "role_2",
        "triggers": {
          "on_previous_roles_signed": {
            "enabled": true,
            "previousRolesConfig": { "mode": "custom", "selectedRoleIds": ["role_1"] }
          },
          "on_all_signatures_complete": { "enabled": true }
        }
      }
    ]
  }
}
```

---

### 7. `content`

Contenido del documento en formato ProseMirror JSON.

```typescript
interface ProseMirrorDocument {
  type: 'doc';
  content: ProseMirrorNode[];
}

interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}
```

---

## Tipos de Nodos

### Bloques de Texto

| Tipo | Descripción | Atributos |
|------|-------------|-----------|
| `paragraph` | Párrafo | - |
| `heading` | Encabezado | `level: 1 \| 2 \| 3` |
| `blockquote` | Cita | - |
| `codeBlock` | Código | `language?: string` |
| `horizontalRule` | Divisor | - |

**Ejemplo:**
```json
{
  "type": "heading",
  "attrs": { "level": 1 },
  "content": [{ "type": "text", "text": "CONTRATO DE SERVICIOS" }]
}
```

### Listas

| Tipo | Descripción | Atributos |
|------|-------------|-----------|
| `bulletList` | Lista con viñetas | - |
| `orderedList` | Lista numerada | `start?: number` |
| `taskList` | Lista de tareas | - |
| `listItem` | Ítem de lista | - |
| `taskItem` | Ítem de tarea | `checked: boolean` |

**Ejemplo:**
```json
{
  "type": "bulletList",
  "content": [
    {
      "type": "listItem",
      "content": [
        { "type": "paragraph", "content": [{ "type": "text", "text": "Primer ítem" }] }
      ]
    }
  ]
}
```

### Salto de Página

```json
{
  "type": "pageBreak",
  "attrs": { "id": "pb-1703936400000" }
}
```

### Imagen

```typescript
interface ImageAttrs {
  src: string;           // URL o data:base64
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  displayMode: 'block' | 'inline';
  align: 'left' | 'center' | 'right';
  shape: 'square' | 'circle';
}
```

**Ejemplo:**
```json
{
  "type": "image",
  "attrs": {
    "src": "data:image/png;base64,iVBORw0KGgo...",
    "alt": "Logo empresa",
    "width": 200,
    "height": 100,
    "displayMode": "block",
    "align": "center",
    "shape": "square"
  }
}
```

### Inyector de Variable

Placeholder para valores dinámicos. Solo almacena el `variableId`; el resto de la metadata (tipo, label, etc.) se obtiene del backend al renderizar.

```typescript
interface InjectorAttrs {
  variableId: string;  // Referencia a variable del backend
}
```

**Ejemplo:**
```json
{
  "type": "injector",
  "attrs": {
    "variableId": "client_name"
  }
}
```

### Bloque de Firmas

```typescript
interface SignatureAttrs {
  count: 1 | 2 | 3 | 4;
  layout: SignatureLayout;
  lineWidth: 'sm' | 'md' | 'lg';
  signatures: SignatureItem[];
}

interface SignatureItem {
  id: string;
  roleId?: string;
  label: string;
  subtitle?: string;
  imageData?: string;      // Base64 de firma
  imageOriginal?: string;  // Original para re-editar
  imageOpacity?: number;   // 0-100
  imageRotation?: number;  // 0, 90, 180, 270
  imageScale?: number;
  imageX?: number;
  imageY?: number;
}
```

**Layouts disponibles:**

| Count | Layouts |
|-------|---------|
| 1 | `single-left`, `single-center`, `single-right` |
| 2 | `dual-sides`, `dual-center`, `dual-left`, `dual-right` |
| 3 | `triple-row`, `triple-pyramid`, `triple-inverted` |
| 4 | `quad-grid`, `quad-top-heavy`, `quad-bottom-heavy` |

**Ejemplo:**
```json
{
  "type": "signature",
  "attrs": {
    "count": 2,
    "layout": "dual-sides",
    "lineWidth": "md",
    "signatures": [
      { "id": "sig_1", "roleId": "role_1", "label": "Cliente" },
      { "id": "sig_2", "roleId": "role_2", "label": "Representante" }
    ]
  }
}
```

### Bloque Condicional

Contenido que se muestra según condiciones lógicas.

```typescript
interface ConditionalAttrs {
  conditions: LogicGroup;
  expression: string;  // Resumen legible
}

interface LogicGroup {
  id: string;
  type: 'group';
  logic: 'AND' | 'OR';
  children: (LogicRule | LogicGroup)[];
}

interface LogicRule {
  id: string;
  type: 'rule';
  variableId: string;
  operator: RuleOperator;
  value: {
    mode: 'text' | 'variable';
    value: string;
  };
}
```

**Operadores disponibles:**

| Tipo | Operadores |
|------|------------|
| Comunes | `eq`, `neq`, `empty`, `not_empty` |
| TEXT | `starts_with`, `ends_with`, `contains` |
| NUMBER/CURRENCY | `gt`, `gte`, `lt`, `lte` |
| DATE | `before`, `after` |
| BOOLEAN | `is_true`, `is_false` |

**Ejemplo:**
```json
{
  "type": "conditional",
  "attrs": {
    "conditions": {
      "id": "root",
      "type": "group",
      "logic": "AND",
      "children": [
        {
          "id": "rule_1",
          "type": "rule",
          "variableId": "is_renewal",
          "operator": "is_true",
          "value": { "mode": "text", "value": "" }
        }
      ]
    },
    "expression": "is_renewal = ✓"
  },
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Este contrato es una renovación." }]
    }
  ]
}
```

---

## Marks (Formato de Texto)

| Mark | Descripción | Atributos |
|------|-------------|-----------|
| `bold` | Negrita | - |
| `italic` | Cursiva | - |
| `strike` | Tachado | - |
| `code` | Código inline | - |
| `underline` | Subrayado | - |
| `highlight` | Resaltado | `color?: string` |
| `link` | Enlace | `href: string`, `target?: string` |

**Ejemplo:**
```json
{
  "type": "text",
  "text": "texto importante",
  "marks": [
    { "type": "bold" },
    { "type": "highlight", "attrs": { "color": "#ffeb3b" } }
  ]
}
```

---

### 8. `exportInfo`

Metadata de la exportación.

```typescript
interface ExportInfo {
  exportedAt: string;      // ISO 8601
  exportedBy?: string;
  sourceApp: string;
  checksum?: string;
}
```

**Ejemplo:**
```json
"exportInfo": {
  "exportedAt": "2025-12-30T10:30:00.000Z",
  "sourceApp": "doc-assembly-web/1.0.0",
  "checksum": "a1b2c3d4"
}
```

---

## Ejemplo Completo

```json
{
  "version": "1.1.0",
  "meta": {
    "title": "Contrato de Servicios Profesionales",
    "description": "Plantilla para contratos de consultoría",
    "language": "es"
  },
  "pageConfig": {
    "formatId": "A4",
    "width": 794,
    "height": 1123,
    "margins": { "top": 96, "bottom": 96, "left": 72, "right": 72 },
    "showPageNumbers": true,
    "pageGap": 40
  },
  "variableIds": ["client_name", "client_email", "contract_date", "total_amount", "is_renewal"],
  "signerRoles": [
    {
      "id": "role_1",
      "label": "Cliente",
      "name": { "type": "injectable", "value": "client_name" },
      "email": { "type": "injectable", "value": "client_email" },
      "order": 1
    },
    {
      "id": "role_2",
      "label": "Representante Legal",
      "name": { "type": "text", "value": "María González" },
      "email": { "type": "text", "value": "legal@empresa.com" },
      "order": 2
    }
  ],
  "signingWorkflow": {
    "orderMode": "sequential",
    "notifications": {
      "scope": "global",
      "globalTriggers": {
        "on_document_created": { "enabled": false },
        "on_turn_to_sign": { "enabled": true },
        "on_all_signatures_complete": { "enabled": false }
      },
      "roleConfigs": []
    }
  },
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 1 },
        "content": [{ "type": "text", "text": "CONTRATO DE SERVICIOS PROFESIONALES" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Entre " },
          { "type": "injector", "attrs": { "variableId": "client_name" } },
          { "type": "text", "text": " (en adelante \"El Cliente\") y la empresa, se acuerda lo siguiente:" }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "1. OBJETO DEL CONTRATO" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "El presente contrato tiene por objeto la prestación de servicios profesionales de consultoría." }
        ]
      },
      {
        "type": "conditional",
        "attrs": {
          "conditions": {
            "id": "root",
            "type": "group",
            "logic": "AND",
            "children": [
              { "id": "r1", "type": "rule", "variableId": "is_renewal", "operator": "is_true", "value": { "mode": "text", "value": "" } }
            ]
          },
          "expression": "is_renewal = ✓"
        },
        "content": [
          {
            "type": "paragraph",
            "content": [
              { "type": "text", "text": "Este contrato constituye una ", "marks": [{ "type": "bold" }] },
              { "type": "text", "text": "renovación", "marks": [{ "type": "bold" }, { "type": "highlight" }] },
              { "type": "text", "text": " del contrato anterior.", "marks": [{ "type": "bold" }] }
            ]
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "2. MONTO Y FORMA DE PAGO" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "El monto total del contrato es de " },
          { "type": "injector", "attrs": { "variableId": "total_amount" } },
          { "type": "text", "text": "." }
        ]
      },
      { "type": "pageBreak", "attrs": { "id": "pb-1" } },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "FIRMAS" }]
      },
      {
        "type": "signature",
        "attrs": {
          "count": 2,
          "layout": "dual-sides",
          "lineWidth": "md",
          "signatures": [
            { "id": "sig_1", "roleId": "role_1", "label": "El Cliente" },
            { "id": "sig_2", "roleId": "role_2", "label": "Representante Legal" }
          ]
        }
      }
    ]
  },
  "exportInfo": {
    "exportedAt": "2025-12-30T10:30:00.000Z",
    "sourceApp": "doc-assembly-web/1.1.0"
  }
}
```

---

## API de Uso

### Exportar

```typescript
import { exportDocument, downloadAsJson } from '@/features/editor/services';
import { usePaginationStore } from '@/features/editor/stores/pagination-store';
import { useSignerRolesStore } from '@/features/editor/stores/signer-roles-store';

// Obtener datos de stores
const paginationConfig = usePaginationStore.getState().config;
const { roles: signerRoles, workflowConfig } = useSignerRolesStore.getState();

// Exportar documento (extrae automáticamente los variableIds del contenido)
const document = exportDocument(
  editor,
  { paginationConfig, signerRoles, workflowConfig },
  { title: 'Mi Contrato', language: 'es' },
  { includeChecksum: true }
);

// Descargar como archivo
downloadAsJson(document, 'contrato.json');
```

### Importar

```typescript
import { importFromFile, importDocument } from '@/features/editor/services';
import type { BackendVariable } from '@/features/editor/types';

// Obtener variables del backend
const backendVariables: BackendVariable[] = await fetchVariablesFromAPI();

// Desde archivo (abre diálogo)
const result = await importFromFile(
  editor,
  {
    setPaginationConfig: (config) => usePaginationStore.setState({ config }),
    setSignerRoles: (roles) => useSignerRolesStore.getState().setRoles(roles),
    setWorkflowConfig: (config) => useSignerRolesStore.getState().setWorkflowConfig(config),
  },
  backendVariables  // Para resolver y validar variables
);

if (result?.success) {
  console.log('Documento importado correctamente');

  // Verificar si hay variables huérfanas
  if (result.orphanedVariables?.length) {
    console.warn('Variables no encontradas en backend:', result.orphanedVariables);
  }
} else {
  console.error('Errores:', result?.validation.errors);
}

// Desde JSON string
const result = importDocument(jsonString, editor, storeActions, backendVariables);
```

### Validar

```typescript
import { validateDocumentForImport } from '@/features/editor/services';
import type { BackendVariable } from '@/features/editor/types';

// Obtener variables del backend para validación completa
const backendVariables: BackendVariable[] = await fetchVariablesFromAPI();

const validation = validateDocumentForImport(jsonString, backendVariables);

if (!validation.valid) {
  console.error('Errores:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Advertencias:', validation.warnings);
  // Incluye warnings ORPHANED_VARIABLE si variables no existen en backend
}
```

### Detectar Variables Huérfanas

```typescript
import { getOrphanedVariableIds } from '@/features/editor/services';

// Obtener variables del documento que no existen en el backend
const orphaned = getOrphanedVariableIds(document, backendVariables);

if (orphaned.length > 0) {
  console.warn('Variables en documento que no existen en backend:', orphaned);
}
```

---

## Validaciones

### Schema (Zod)
- Estructura del documento
- Tipos de datos
- Campos requeridos
- Formato de versión

### Semánticas
- Variables referenciadas en `injector` existen en `variableIds[]`
- Roles referenciados en `signature` existen en `signerRoles[]`
- Variables en `conditional.conditions` existen en `variableIds[]`
- Variables en `signerRoles[].name/email` (tipo injectable) existen en `variableIds[]`
- Roles en `signingWorkflow.notifications.roleConfigs[].roleId` existen en `signerRoles[]`
- Roles en `previousRolesConfig.selectedRoleIds` existen en `signerRoles[]`
- Tamaño de imágenes Base64 < 5MB

### Validación contra Backend (opcional)
Si se proporciona `backendVariables` al importar/validar:
- Verifica que cada ID en `variableIds[]` existe en la lista del backend
- Genera warnings `ORPHANED_VARIABLE` para variables que no existen
- Genera warnings `ORPHANED_CONDITION_VARIABLE` para variables en condiciones
- Genera warnings `ORPHANED_ROLE_*_VARIABLE` para variables en roles de firma

---

## Migraciones

El campo `version` permite migrar documentos antiguos:

```typescript
import { needsMigration, migrateDocument } from '@/features/editor/services';

if (needsMigration(document)) {
  const migrated = migrateDocument(document);
  // migrated.version === DOCUMENT_FORMAT_VERSION
}
```

### Migraciones Implementadas

| De → A | Cambios |
|--------|---------|
| 1.0.0 → 1.1.0 | Agrega `signingWorkflow` con configuración por defecto (parallel, notificaciones globales) |

---

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `src/features/editor/types/document-format.ts` | Interfaces TypeScript |
| `src/features/editor/schemas/document-schema.ts` | Schemas Zod |
| `src/features/editor/services/document-export.ts` | Servicio de exportación |
| `src/features/editor/services/document-import.ts` | Servicio de importación |
| `src/features/editor/services/document-migrations.ts` | Migraciones |
| `src/features/editor/services/document-validator.ts` | Validador semántico |
