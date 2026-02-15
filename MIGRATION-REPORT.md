# Reporte de Migración: pdf-forge → doc-assembly

**Fecha**: 14 de febrero de 2026
**Origen**: `/Users/rendis/Documents/Projects/Libraries/pdf-forge` (fork enfocado en renderizado)
**Destino**: `/Users/rendis/Documents/Projects/Libraries/doc-assembly` (proyecto principal con firma digital)

---

## Resumen Ejecutivo

Se migraron **+30 mejoras** del fork pdf-forge de vuelta a doc-assembly, organizadas en 7 lotes de ejecución. La migración preserva toda la funcionalidad específica de doc-assembly (firma digital, roles de firmantes, componentes de workflow) incorporando mejoras del editor, correcciones de renderizado y mejoras de infraestructura desarrolladas en el fork.

**Impacto**: 96 archivos modificados, 3.611 inserciones, 5.064 eliminaciones (reducción neta por eliminación del renderer Chrome en fases anteriores).

---

## Inventario de Migración

### A. Editor — Mejoras de Inyectables Inline

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| A1 | **Redimensión de Ancho del Chip Inyector** — Handle de arrastre para ancho horizontal en inyectables escalares, persistido como atributo del nodo, renderizado como `#box(width:)` en Typst | LISTO | `InjectorComponent.tsx`, `InjectorExtension.ts`, `typst_converter_impl.go` |
| A2 | **Etiquetas Personalizables (Prefijo/Sufijo)** — InjectorConfigDialog con defaultValue, prefix, suffix, showLabelIfEmpty. Integración con menú contextual | LISTO | `InjectorConfigDialog.tsx` (nuevo), `InjectorComponent.tsx`, `EditorNodeContextMenu.tsx` |
| A3 | **Visualización de Código en Chip** — Muestra `variableId` en lugar del label en los chips del editor; label i18n como tooltip | LISTO | `InjectorComponent.tsx`, `MentionExtension.ts` |

### B. Editor — Texto Enriquecido y Formato

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| B1 | **Extensión StoredMarksPersistence** — Plugin ProseMirror que preserva formato (negrita, fuente, tamaño) en párrafos vacíos | LISTO | `StoredMarksPersistence.ts` (nuevo), `DocumentEditor.tsx` |
| B2 | **TextColorPicker** — Cuadrícula visual de colores (8 columnas) + input hexadecimal personalizado, reemplaza dropdown genérico | LISTO | `TextColorPicker.tsx` (nuevo), `EditorToolbar.tsx` |
| B3 | **FontFamilyPicker / FontSizePicker** — Popovers dedicados reemplazando Radix Select, evita robo de foco del editor | LISTO | `FontFamilyPicker.tsx` (nuevo), `FontSizePicker.tsx` (nuevo), `EditorToolbar.tsx` |
| B4 | **Actualización TipTap 3.15 → 3.19** — 4 versiones menores con correcciones y mejoras | LISTO | `package.json`, `pnpm-lock.yaml` |

### C. Editor — Manejo de Imágenes

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| C1 | **Envoltura de Texto en Imágenes** — Modos de alineación `wrap-left`/`wrap-right` con CSS float en editor + paquete Typst `wrap-it` | LISTO | `ImageExtension`, `typst_converter_impl.go`, `typst_helpers.go` |
| C2 | **Alineación de Márgenes de Imagen** — Sobreescribe márgenes de Tailwind prose en imágenes flotantes; atributo `data-display-mode` | LISTO | Image NodeView, ajustes CSS |

### D. Editor — Mejoras de Tablas

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| D1 | **Restricción de Redimensión de Columnas** — Restringido a par de columnas adyacentes; extensiones personalizadas reemplazan las de @tiptap | LISTO | `TableExtension.ts` (nuevo, 349 líneas), `DocumentEditor.tsx` |
| D2 | **Corrección de Superposición de Menú** — Reposicionamiento del bubble menu para evitar superposición con menús contextuales de tabla | LISTO | Componentes de tabla |
| D3 | **Deshabilitar Encabezados en Celdas** — Evita comandos de heading dentro de tablas para prevenir problemas de layout | LISTO | Configuración de extensión de tabla |

### E. Editor — Variables y UX

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| E1 | **Modal de Variables** — Modal de 800px para explorar variables con búsqueda avanzada (grupos, nombres, IDs) | LISTO | `VariablesModal.tsx` (nuevo), `VariablesPanel.tsx` (botón Maximize2) |
| E2 | **Modal de Importación de Documento** — Pestañas de carga de archivo + pegado de JSON para importar contenido | LISTO | `ImportDocumentModal/` (5 archivos nuevos), ruta del editor |
| E3 | **Filtrado usedVariableIds** — InjectablesFormModal filtra para mostrar solo variables usadas en el documento | LISTO | `InjectablesFormModal.tsx`, `PreviewButton.tsx`, `document-export.ts` |
| E4 | **Cerrar Modal tras Selección** — Cierre automático del modal de variables al elegir una | LISTO | `VariablesModal.tsx` (integrado en handleVariableClick) |
| E5 | **Visibilidad de Config. de Página** — PageSettings siempre visible independiente del estado del panel | LISTO | Ya correcto en el layout de doc-assembly |

### F. Renderizado — Mejoras Typst

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| F1 | **Envoltura de Texto en Imágenes** — Integración del paquete Typst `wrap-it` con agrupación look-ahead | LISTO | `typst_converter_impl.go`, `typst_helpers.go` |
| F2 | **Preservación de Anchos de Columna** — `parseEditableTableColumnWidths()` convierte px de TipTap a pt de Typst (1px = 0.75pt) | LISTO | `typst_converter_impl.go` |
| F3 | **Dígitos Proporcionales** — `number-width: "proportional"` en configuración de texto Typst | LISTO | `typst_config.go` |
| F4 | **Insets de Celdas de Tabla** — Restaurado x-inset de celdas a 6pt (coincide con padding de 8px del editor) | LISTO | `typst_styles.go` |
| F5 | **Soporte Data URL en Imágenes** — Decodifica URLs base64, escribe archivos temporales para Typst | LISTO | `image_cache.go` |
| F6 | **Normalización de Alturas de Fila** — Elimina espaciado vertical en Typst para coincidir con el editor | LISTO | `typst_converter_impl.go` |
| F7 | **Tipo de Nodo HardBreak** — `NodeTypeHardBreak = "hardBreak"` en modelo de contenido portabledoc | LISTO | `portabledoc/content.go` |
| F8 | **Tests del Convertidor Typst** — Tests de integración para el convertidor | LISTO | `typst_converter_test.go` (nuevo) |

### G. Backend — i18n y Agrupación de Inyectables

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| G1 | **Etiquetas/Descripciones i18n de Inyectables** — `Labels`, `Descriptions` (mapas i18n) y campo `Group` en InjectableDefinition | LISTO | `injectable.go`, `injectable_dto.go`, `injectable_mapper.go`, `injector_registry.go` |
| G2 | **Utilidad i18n-resolve.ts** — Helper `resolveI18n()` con cadena de fallback (locale → "en" → "es" → primer disponible) | LISTO | `i18n-resolve.ts` (nuevo) |
| G3 | **GetGroupConfig** — Organiza inyectables en grupos visuales en el panel | LISTO | `injector_registry.go`, `VariableGroup.tsx` |

### H. Infraestructura

| # | Funcionalidad | Estado | Archivos |
|---|---------------|--------|----------|
| H1 | **Registro de Tipos MIME** — Tipos MIME explícitos en `init()` para consistencia multiplataforma | LISTO | `http.go` |
| H2 | **Caché de Templates (Ristretto)** — Caché de templates Typst compilados con TTL usando `dgraph-io/ristretto/v2` | LISTO | `config/types.go`, `go.mod` |
| H3 | **ErrRendererBusy** — Error de gestión de capacidad cuando el renderer está al máximo de concurrencia | LISTO | `errors.go`, `service.go` |
| H4 | **Actualización de Seguridad Axios** — 1.9.0 → 1.13.5 (corrección de vulnerabilidad DoS) | LISTO | `package.json` |
| H5 | **Configuración Bootstrap** — Auto-promoción del primer usuario a SUPERADMIN en despliegue nuevo | LISTO | `config/types.go`, `app.yaml` |

---

## Archivos Nuevos Creados (37)

### Backend
- `apps/doc-engine/internal/core/entity/list_value.go`
- `apps/doc-engine/internal/core/port/render_authenticator.go`
- `apps/doc-engine/internal/core/port/workspace_injectable_provider.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/image_cache.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_builder.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_condition.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_config.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_converter.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_converter_impl.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_converter_test.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_helpers.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_renderer.go`
- `apps/doc-engine/internal/core/service/rendering/pdfrenderer/typst_styles.go`
- `apps/doc-engine/internal/infra/config/discovery.go`
- `apps/doc-engine/internal/adapters/primary/http/middleware/custom_render_auth.go`
- `apps/doc-engine/internal/adapters/primary/http/middleware/dummy_auth.go`
- `apps/doc-engine/internal/adapters/primary/http/middleware/request_timeout.go`
- `apps/doc-engine/docs/authentication-guide.md`

### Frontend
- `apps/web-client/src/features/editor/components/FontFamilyPicker.tsx`
- `apps/web-client/src/features/editor/components/FontSizePicker.tsx`
- `apps/web-client/src/features/editor/components/TextColorPicker.tsx`
- `apps/web-client/src/features/editor/components/InjectorConfigDialog.tsx`
- `apps/web-client/src/features/editor/components/VariablesModal.tsx`
- `apps/web-client/src/features/editor/components/ImportDocumentModal/ImportDocumentModal.tsx`
- `apps/web-client/src/features/editor/components/ImportDocumentModal/FileTab.tsx`
- `apps/web-client/src/features/editor/components/ImportDocumentModal/PasteJsonTab.tsx`
- `apps/web-client/src/features/editor/components/ImportDocumentModal/types.ts`
- `apps/web-client/src/features/editor/components/ImportDocumentModal/index.ts`
- `apps/web-client/src/features/editor/extensions/StoredMarksPersistence.ts`
- `apps/web-client/src/features/editor/extensions/Table/TableExtension.ts`
- `apps/web-client/src/features/editor/types/i18n-resolve.ts`
- `apps/web-client/src/features/editor/types/list-input.ts`
- `apps/web-client/src/features/editor/extensions/ListInjector/` (directorio)
- `apps/web-client/src/features/editor/extensions/Conditional/builder/LogicBuilderVariablesPanel.tsx`
- `apps/web-client/src/features/editor/components/preview/ListDataInput.tsx`
- `apps/web-client/src/features/editor/components/preview/ListInjectablesSection.tsx`
- `apps/web-client/src/features/editor/config/` (6 archivos de configuración)
- `apps/web-client/src/lib/auth-config.ts`

---

## Archivos Eliminados (14)

Archivos del renderizador basado en Chrome (reemplazados por Typst):
- `chrome.go`, `html_builder.go`, `node_converter.go`, `pool.go`, `pool_test.go`, `styles.go`

Adaptadores de firma deprecados:
- `docuseal/adapter.go`, `docuseal/config.go`, `docuseal/mapper.go`
- `opensign/adapter.go`, `opensign/config.go`, `opensign/mapper.go`, `opensign/types.go`

---

## Resultados de Verificación

### Backend (`apps/doc-engine/`)
| Verificación | Resultado |
|--------------|-----------|
| `make wire` | PASA |
| `make build` | PASA |
| `make test` | PASA (6.8% cobertura) |
| `make lint` | PASA (0 issues) |
| `go build -tags=integration ./...` | PASA |

### Frontend (`apps/web-client/`)
| Verificación | Resultado |
|--------------|-----------|
| `pnpm build` | PASA (compilado en ~6s) |
| `pnpm lint` | 5 errores preexistentes, 0 errores nuevos |

Errores de lint preexistentes (no introducidos por la migración):
1. `WorkspaceFormDialog.tsx:36` — `setCurrentWorkspace` sin usar
2. `WorkspaceFormDialog.tsx:108` — `previousWorkspace` sin usar
3. `ImageInsertModal.tsx:28` — directiva eslint-disable sin usar
4. `TableDataInput.tsx:52` — parámetro `lang` sin usar
5. `TableDataInput.tsx:182` — parámetro `variableId` sin usar

---

## Cambios de Dependencias

### Backend (`go.mod`)
- Agregado `github.com/dgraph-io/ristretto/v2` (caché de templates)
- Actualizadas dependencias existentes por compatibilidad

### Frontend (`package.json`)
- TipTap: `3.0.0-next.15` → `3.0.0-next.19` (4 versiones menores)
- Agregado `@tiptap/extension-color` (soporte de color de texto)
- Axios: `1.9.0` → `1.13.5` (corrección de seguridad por vulnerabilidad DoS)

---

## Decisiones de Arquitectura

### Elementos Preservados de doc-assembly
- **Extensión de firma** — `SignatureExtension`, `SignerRolesPanel`, `SignerRolesProvider` sin modificar
- **Inyectables de roles de firmantes** — Variables de rol (tipo ROLE_TEXT) permanecen en VariablesPanel
- **Adaptadores de firma** — Adaptador Documenso conservado; DocuSeal/OpenSign antiguos eliminados (limpieza separada)
- **Wire DI** — Todos los servicios nuevos correctamente conectados a través de `di.go`
- **RBAC** — Sistema de roles de tres niveles preservado

### Decisiones Técnicas Clave
1. **Extensión de Tabla Personalizada** — Se reemplazaron los built-ins de `@tiptap/extension-table` con implementación personalizada (`TableExtension.ts`, 349 líneas) para soportar redimensión restringida de columnas (solo par adyacente). Este es el cambio frontend más significativo.
2. **StoredMarksPersistence** — Enfoque de plugin ProseMirror (no extensión TipTap) para máximo control sobre el ciclo de vida de preservación de marks.
3. **VariablesModal** — Componente separado (no un modo del VariablesPanel) para evitar complejidad en el componente del panel, que ya es grande. Reutiliza los mismos primitivos `DraggableVariable` y `VariableGroup`.
4. **usedVariableIds** — Filtrado basado en Set en InjectablesFormModal con utilidad `extractVariableIdsFromEditor()`. Opt-in via prop (retrocompatible).

---

## Línea de Tiempo de Ejecución

| Lote | Tareas | Agente | Modo |
|------|--------|--------|------|
| 1 — Fundación | Actualización TipTap, HardBreak, i18n-resolve, Axios | Los 3 | Paralelo |
| 2 — Core de Renderizado | Anchos de tabla, dígitos proporcionales, insets de celdas, data URLs, alturas de fila, tests del convertidor | typst-renderer | Secuencial |
| 3 — Core del Editor | StoredMarksPersistence, TextColorPicker, FontPickers, redimensión de tabla, corrección de menú, encabezados | editor-frontend | Secuencial |
| 4 — Funcionalidades de Inyectables | Ancho de chip, etiquetas, visualización de código, i18n (backend), ancho/etiquetas Typst | Los 3 | Paralelo |
| 5 — Imagen y Layout | Envoltura de texto en imágenes (frontend + Typst) | typst-renderer | Secuencial |
| 6 — Pulido UX | Modal de variables, modal de importación, usedVariableIds, cerrar al seleccionar | editor-frontend | Secuencial |
| 7 — Infraestructura | Tipos MIME, caché Ristretto, ErrRendererBusy, config Bootstrap | backend-infra | Secuencial |

**Equipo**: 4 agentes especializados (editor-frontend, typst-renderer, backend-infra, editor-ux-migration) orquestados por team-lead.

---

## Riesgos y Recomendaciones

### Probar Antes de Producción
1. **Extensión de Tabla Personalizada (D1)** — Cambio más significativo. Probar con documentos existentes que contengan tablas, especialmente con bloques de Firma en celdas de tabla.
2. **TipTap 3.19** — 4 versiones menores. Probar drag handles de la extensión de Firma y comportamiento de selección.
3. **Envoltura de Imágenes (C1/F1)** — Nuevo modo de layout. Probar con varios tamaños de imagen y texto adyacente.
4. **InjectorConfigDialog (A2)** — Nuevo sistema de prefijo/sufijo. Probar con documentos existentes que tengan nodos inyectables.

### Limitaciones Conocidas
- El paquete Typst `wrap-it` debe estar disponible en la instalación de Typst para que la envoltura de imágenes funcione en la salida PDF.
- El caché de templates (Ristretto) usa caché en memoria — no se comparte entre instancias en despliegues multi-nodo.
- La configuración Bootstrap (H5) necesita verificación manual en despliegue nuevo para confirmar la auto-promoción a SUPERADMIN.

### Seguimientos Sugeridos
- Agregar tests E2E para las nuevas funcionalidades del editor (modal de importación, modal de variables, selector de color).
- Documentar el comportamiento de la extensión de tabla personalizada para futuros mantenedores.
- Considerar lazy-loading del ImportDocumentModal (ya chunked por Vite pero podría optimizarse).
