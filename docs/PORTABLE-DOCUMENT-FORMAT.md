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

> **Nota sobre variables de rol**: Los IDs de variables de rol (como `ROLE.Cliente.name`) **NO** se incluyen en este array. Las variables de rol se generan dinámicamente en el frontend a partir de los `signerRoles` definidos en el documento. Ver sección [Inyectables de Rol](#inyectables-de-rol) para más detalles.

#### Definiciones de Variables (Backend)

Las variables se obtienen desde la API del backend:

```typescript
type VariableType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE' | 'ROLE_TEXT';

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
  name: SignerRoleFieldValue;
  email: SignerRoleFieldValue;
  order: number;    // Orden de firma (1-based)
}

interface SignerRoleFieldValue {
  type: 'text' | 'injectable';
  value: string;  // Texto fijo o variableId según el tipo
}
```

#### Tipos de Campo (`type`)

| Tipo | Descripción | Valor (`value`) | Cuándo usar |
|------|-------------|-----------------|-------------|
| `text` | Valor fijo/literal | El texto exacto a mostrar (ej: `"Juan Pérez"`) | Cuando el firmante es conocido y fijo |
| `injectable` | Referencia a variable | El `variableId` de una variable del backend (ej: `"client_name"`) | Cuando el firmante es dinámico |

> **Validación**: Si `type` es `injectable`, el `value` debe corresponder a un ID presente en el array `variableIds[]` del documento.

**Ejemplo con ambos tipos:**
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

En este ejemplo:
- **role_1 (Cliente)**: Nombre y email son dinámicos, se obtienen de las variables `client_name` y `client_email`
- **role_2 (Representante Legal)**: Nombre y email son fijos, siempre serán "Juan Pérez" y "legal@empresa.com"

---

### Inyectables de Rol

Los **inyectables de rol** son variables especiales que se generan automáticamente a partir de los `signerRoles` definidos en el documento. Permiten insertar en el contenido del documento propiedades dinámicas de los firmantes (nombre, email).

#### Concepto

A diferencia de las variables regulares (que vienen del backend), las variables de rol:
- Se generan dinámicamente en el frontend
- No se almacenan en `variableIds[]`
- Tienen el tipo especial `ROLE_TEXT`
- Su `variableId` sigue el formato: `ROLE.{label}.{property}`

#### Propiedades Disponibles

| Propiedad | Descripción | Ejemplo de variableId |
|-----------|-------------|----------------------|
| `name` | Nombre del firmante | `ROLE.Cliente.name` |
| `email` | Email del firmante | `ROLE.Cliente.email` |

#### Flujo de Generación

```
┌─────────────────────────────────────────────────────────────────┐
│  signerRoles: [                                                 │
│    { id: "role_1", label: "Cliente", ... }                      │
│  ]                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend genera automáticamente:                               │
│  - { variableId: "ROLE.Cliente.name", type: "ROLE_TEXT", ... }  │
│  - { variableId: "ROLE.Cliente.email", type: "ROLE_TEXT", ... } │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Disponibles en el editor para insertar con @                   │
│  Aparecen como: "Cliente.nombre", "Cliente.email"               │
└─────────────────────────────────────────────────────────────────┘
```

#### Nodo Injector de Rol

Cuando se inserta un inyectable de rol en el documento, el nodo `injector` tiene atributos especiales:

```typescript
interface RoleInjectorAttrs {
  type: 'ROLE_TEXT';           // Tipo especial para roles
  label: string;               // Ej: "Cliente.nombre"
  variableId: string;          // Ej: "ROLE.Cliente.name"
  isRoleVariable: true;        // Marca que es variable de rol
  roleId: string;              // ID del rol (ej: "role_1")
  roleLabel: string;           // Label del rol (ej: "Cliente")
  propertyKey: 'name' | 'email'; // Propiedad del rol
}
```

**Ejemplo de nodo:**
```json
{
  "type": "injector",
  "attrs": {
    "type": "ROLE_TEXT",
    "label": "Cliente.nombre",
    "variableId": "ROLE.Cliente.name",
    "isRoleVariable": true,
    "roleId": "role_1",
    "roleLabel": "Cliente",
    "propertyKey": "name"
  }
}
```

#### Diferenciación Visual

En el editor, los inyectables de rol se muestran con **color violeta/púrpura** para distinguirlos de las variables regulares (que son azules).

#### Caso de Uso

```
Documento dice: "El firmante {Cliente.nombre} con email {Cliente.email} acepta..."

Donde:
- {Cliente.nombre} → Nodo injector con variableId: "ROLE.Cliente.name"
- {Cliente.email} → Nodo injector con variableId: "ROLE.Cliente.email"

Al renderizar, estos valores se obtienen del signerRole "Cliente":
- Si name.type = "injectable" → Se resuelve la variable referenciada
- Si name.type = "text" → Se usa el valor literal
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

Placeholder para valores dinámicos que se reemplazan al renderizar el documento.

#### Atributos Completos

```typescript
interface InjectorAttrs {
  // Atributos comunes
  type: InjectorType;          // Tipo de variable
  label: string;               // Etiqueta visible en el editor
  variableId: string;          // ID de la variable
  format?: string;             // Formato de visualización (para DATE, CURRENCY)
  required?: boolean;          // Si es obligatorio completar

  // Atributos adicionales para variables de rol (ver sección Inyectables de Rol)
  isRoleVariable?: boolean;    // true si es variable de rol
  roleId?: string;             // ID del rol de firma
  roleLabel?: string;          // Label del rol
  propertyKey?: 'name' | 'email'; // Propiedad del rol
}

type InjectorType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE' | 'ROLE_TEXT';
```

#### Variable Regular vs Variable de Rol

| Aspecto | Variable Regular | Variable de Rol |
|---------|------------------|-----------------|
| `isRoleVariable` | `false` o ausente | `true` |
| `type` | Cualquier tipo | `ROLE_TEXT` |
| `variableId` | ID del backend (ej: `client_name`) | Formato `ROLE.{label}.{prop}` |
| Origen | Backend (`variableIds[]`) | Generado de `signerRoles` |
| Color en editor | Azul | Violeta |

#### Ejemplo: Variable Regular

```json
{
  "type": "injector",
  "attrs": {
    "type": "TEXT",
    "label": "Nombre del cliente",
    "variableId": "client_name",
    "required": true
  }
}
```

#### Ejemplo: Variable de Rol

```json
{
  "type": "injector",
  "attrs": {
    "type": "ROLE_TEXT",
    "label": "Cliente.nombre",
    "variableId": "ROLE.Cliente.name",
    "isRoleVariable": true,
    "roleId": "role_1",
    "roleLabel": "Cliente",
    "propertyKey": "name"
  }
}
```

### Bloque de Firmas

Bloque visual para capturar firmas de los participantes del documento.

```typescript
interface SignatureAttrs {
  count: 1 | 2 | 3 | 4;           // Cantidad de firmas en el bloque
  layout: SignatureLayout;        // Disposición visual
  lineWidth: 'sm' | 'md' | 'lg';  // Ancho de la línea de firma
  signatures: SignatureItem[];    // Datos de cada firma
}

interface SignatureItem {
  id: string;                     // ID único de la firma
  roleId?: string;                // Vinculación con signerRoles[].id
  label: string;                  // Etiqueta bajo la línea de firma
  subtitle?: string;              // Subtítulo opcional (cargo, título, etc.)

  // Datos de imagen de firma (cuando el usuario firma)
  imageData?: string;             // Base64 de la imagen procesada
  imageOriginal?: string;         // Base64 original (para re-edición)
  imageOpacity?: number;          // Opacidad: 0-100
  imageRotation?: number;         // Rotación: 0, 90, 180, 270
  imageScale?: number;            // Escala de la imagen
  imageX?: number;                // Posición X dentro del área
  imageY?: number;                // Posición Y dentro del área
}
```

#### Vinculación con Roles de Firma

El campo `roleId` en `SignatureItem` referencia directamente al `id` de un rol en `signerRoles[]`:

```
SignatureItem.roleId ──────► signerRoles[].id
       "role_1"      ──────►     "role_1"
```

Esto permite:
- Asociar cada firma con un firmante específico
- Obtener automáticamente nombre/email del firmante
- Validar que el rol asignado existe en el documento

> **Validación**: Un mismo `roleId` no puede asignarse a múltiples firmas dentro del documento.

#### Anchos de Línea (`lineWidth`)

| Valor | Ancho | Descripción |
|-------|-------|-------------|
| `sm` | 96px (w-24) | Línea corta |
| `md` | 176px (w-44) | Línea mediana (default) |
| `lg` | 288px (w-72) | Línea larga |

#### Layouts Disponibles

| Count | Layout | Descripción |
|-------|--------|-------------|
| 1 | `single-left` | Una firma alineada a la izquierda |
| 1 | `single-center` | Una firma centrada |
| 1 | `single-right` | Una firma alineada a la derecha |
| 2 | `dual-sides` | Una firma a cada lado |
| 2 | `dual-center` | Dos firmas apiladas en el centro |
| 2 | `dual-left` | Dos firmas apiladas a la izquierda |
| 2 | `dual-right` | Dos firmas apiladas a la derecha |
| 3 | `triple-row` | Tres firmas en una fila |
| 3 | `triple-pyramid` | Pirámide invertida: 2 arriba, 1 abajo |
| 3 | `triple-inverted` | Pirámide: 1 arriba, 2 abajo |
| 4 | `quad-grid` | Grid de 2×2 |
| 4 | `quad-top-heavy` | 3 arriba, 1 abajo centrado |
| 4 | `quad-bottom-heavy` | 1 arriba centrado, 3 abajo |

**Ejemplo completo con vinculación a roles:**
```json
{
  "type": "signature",
  "attrs": {
    "count": 2,
    "layout": "dual-sides",
    "lineWidth": "md",
    "signatures": [
      {
        "id": "sig_1",
        "roleId": "role_1",
        "label": "El Cliente",
        "subtitle": "Contratante"
      },
      {
        "id": "sig_2",
        "roleId": "role_2",
        "label": "Representante Legal",
        "subtitle": "Por la empresa"
      }
    ]
  }
}
```

En este ejemplo:
- `sig_1` está vinculada al rol `role_1` (Cliente)
- `sig_2` está vinculada al rol `role_2` (Representante Legal)

### Bloque Condicional

Contenido que se muestra u oculta según condiciones lógicas evaluadas contra variables del documento.

#### Estructura Principal

```typescript
interface ConditionalAttrs {
  conditions: LogicGroup;  // Árbol de condiciones
  expression: string;      // Resumen legible generado automáticamente
}
```

#### Grupos Lógicos (LogicGroup)

Los grupos permiten combinar múltiples reglas o subgrupos con operadores AND/OR.

```typescript
interface LogicGroup {
  id: string;
  type: 'group';
  logic: 'AND' | 'OR';
  children: (LogicRule | LogicGroup)[];  // Puede anidar grupos
}
```

> **Límite de anidamiento**: Máximo **3 niveles** de grupos anidados.

#### Reglas (LogicRule)

Cada regla evalúa una condición sobre una variable.

```typescript
interface LogicRule {
  id: string;
  type: 'rule';
  variableId: string;       // ID de la variable a evaluar
  operator: RuleOperator;   // Operador de comparación
  value: RuleValue;         // Valor contra el que comparar
}

interface RuleValue {
  mode: 'text' | 'variable';  // Tipo de valor
  value: string;              // Valor literal o variableId
}
```

#### Modo de Valor (`value.mode`)

| Modo | Descripción | Ejemplo JSON | Resultado en expression |
|------|-------------|--------------|-------------------------|
| `text` | Valor literal/fijo | `{ "mode": "text", "value": "Juan" }` | `nombre = "Juan"` |
| `variable` | Referencia a otra variable | `{ "mode": "variable", "value": "otro_nombre" }` | `nombre = {otro_nombre}` |

El modo `variable` permite comparar una variable contra el valor de otra variable.

#### Operadores Disponibles por Tipo

| Tipo de Variable | Operadores |
|------------------|------------|
| **Comunes (todos)** | `eq`, `neq`, `empty`, `not_empty` |
| `TEXT`, `ROLE_TEXT` | `starts_with`, `ends_with`, `contains` |
| `NUMBER`, `CURRENCY` | `gt`, `gte`, `lt`, `lte` |
| `DATE` | `before`, `after` |
| `BOOLEAN` | `is_true`, `is_false` |
| `IMAGE`, `TABLE` | Solo `empty`, `not_empty` |

#### Operadores sin Valor

Estos operadores NO requieren un valor en `value.value`:
- `empty` - Variable está vacía
- `not_empty` - Variable no está vacía
- `is_true` - Booleano es verdadero
- `is_false` - Booleano es falso

#### Símbolos en `expression`

El campo `expression` es un resumen legible generado automáticamente. Usa los siguientes símbolos:

| Operador | Símbolo | Significado | Ejemplo en expression |
|----------|---------|-------------|----------------------|
| `eq` | `=` | es igual a | `nombre = "Juan"` |
| `neq` | `≠` | es diferente a | `estado ≠ "inactivo"` |
| `gt` | `>` | mayor que | `edad > "18"` |
| `lt` | `<` | menor que | `monto < "1000"` |
| `gte` | `≥` | mayor o igual que | `precio ≥ "100"` |
| `lte` | `≤` | menor o igual que | `descuento ≤ "50"` |
| `contains` | `∋` | contiene | `email ∋ "@empresa.com"` |
| `starts_with` | `^=` | comienza con | `codigo ^= "PRE"` |
| `ends_with` | `$=` | termina con | `archivo $= ".pdf"` |
| `empty` | `∅` | está vacío | `telefono ∅` |
| `not_empty` | `!∅` | no está vacío | `direccion !∅` |
| `before` | `<` | antes de (fecha) | `fecha < "2025-01-01"` |
| `after` | `>` | después de (fecha) | `inicio > "2024-12-01"` |
| `is_true` | `= ✓` | es verdadero | `activo = ✓` |
| `is_false` | `= ✗` | es falso | `eliminado = ✗` |

#### Generación del `expression`

El string `expression` se genera recursivamente:

1. **Para una regla**: `{variableId} {símbolo} {valor}`
   - Valor texto: `"valor"` (entre comillas)
   - Valor variable: `{variableId}` (entre llaves)
   - Sin valor: solo `{variableId} {símbolo}`

2. **Para un grupo**:
   - Reglas unidas por ` AND ` o ` OR `
   - Si hay múltiples hijos, se envuelven en paréntesis: `(regla1 AND regla2)`

**Ejemplos de expression:**

| Estructura | Expression generada |
|------------|---------------------|
| Una regla simple | `nombre = "Juan"` |
| Dos reglas AND | `nombre = "Juan" AND edad > "18"` |
| Dos reglas OR | `nombre = "Juan" OR nombre = "María"` |
| Grupo anidado | `(nombre = "Juan" AND edad > "18") OR estado = "vip"` |
| Comparar variables | `precio = {precio_base}` |
| Operador sin valor | `activo = ✓` |

#### Ejemplo Básico

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

#### Ejemplo con Múltiples Reglas y Anidamiento

```json
{
  "type": "conditional",
  "attrs": {
    "conditions": {
      "id": "root",
      "type": "group",
      "logic": "OR",
      "children": [
        {
          "id": "group_1",
          "type": "group",
          "logic": "AND",
          "children": [
            {
              "id": "rule_1",
              "type": "rule",
              "variableId": "client_type",
              "operator": "eq",
              "value": { "mode": "text", "value": "premium" }
            },
            {
              "id": "rule_2",
              "type": "rule",
              "variableId": "total_amount",
              "operator": "gte",
              "value": { "mode": "text", "value": "10000" }
            }
          ]
        },
        {
          "id": "rule_3",
          "type": "rule",
          "variableId": "is_vip",
          "operator": "is_true",
          "value": { "mode": "text", "value": "" }
        }
      ]
    },
    "expression": "(client_type = \"premium\" AND total_amount ≥ \"10000\") OR is_vip = ✓"
  },
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Descuento especial aplicado." }]
    }
  ]
}
```

#### Ejemplo Comparando Variables

```json
{
  "id": "rule_compare",
  "type": "rule",
  "variableId": "precio_final",
  "operator": "lte",
  "value": { "mode": "variable", "value": "presupuesto_maximo" }
}
```

Expression resultante: `precio_final ≤ {presupuesto_maximo}`

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
