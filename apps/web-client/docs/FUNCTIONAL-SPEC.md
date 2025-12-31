# Documento Funcional del Sistema: Doc-Assembly

> **Propósito**: Este documento describe las funcionalidades del sistema de forma agnóstica al diseño visual. Está pensado para servir como base para un rebranding y rediseño completo de la interfaz sin sesgar con la implementación actual.

---

## 1. Visión General del Sistema

**Doc-Assembly** es una plataforma multi-tenant para la **creación, gestión y ensamblado de documentos basados en plantillas**. Permite a organizaciones crear plantillas de documentos reutilizables con variables dinámicas y flujos de firma digital configurables.

### Conceptos Clave

| Concepto | Descripción |
|----------|-------------|
| **Tenant** | Organización o cliente que usa la plataforma. Contenedor de nivel superior. |
| **Workspace** | Espacio de trabajo dentro de un tenant. Agrupa plantillas y documentos relacionados. |
| **Template** | Plantilla de documento reutilizable con contenido y estructura definidos. |
| **Version** | Iteración de una plantilla con ciclo de vida propio (borrador → publicada → archivada). |
| **Injectable** | Variable dinámica que se inyecta en el documento al momento de generarlo. |
| **Signer Role** | Rol de firmante definido para el workflow de firmas del documento. |
| **Folder** | Carpeta para organizar plantillas jerárquicamente dentro de un workspace. |
| **Tag** | Etiqueta para categorizar y filtrar plantillas. |

---

## 2. Jerarquía y Estructura del Sistema

```
PLATAFORMA
└── TENANT (Organización)
    ├── Configuración del Tenant
    └── WORKSPACE (Espacio de trabajo)
        ├── Tipo: SYSTEM (plantillas globales) o CLIENT (documentos cliente)
        ├── FOLDERS (estructura jerárquica de carpetas)
        │   └── Subcarpetas anidadas
        ├── TEMPLATES (plantillas)
        │   ├── Tags asociados
        │   └── VERSIONS (versiones)
        │       ├── Contenido del documento
        │       ├── Variables (Injectables)
        │       └── Roles de firmantes
        ├── TAGS (etiquetas del workspace)
        └── INJECTABLES (variables globales del workspace)
```

---

## 3. Gestión de Usuarios y Permisos

### 3.1 Niveles de Roles

El sistema implementa **tres niveles jerárquicos de roles**:

#### Nivel Sistema (Plataforma)
- **SUPERADMIN**: Control total de la plataforma
- **PLATFORM_ADMIN**: Administración limitada de tenants y auditoría

#### Nivel Tenant (Organización)
- **TENANT_OWNER**: Control total del tenant
- **TENANT_ADMIN**: Gestión de workspaces del tenant

#### Nivel Workspace (Espacio de trabajo)
- **OWNER**: Control total del workspace
- **ADMIN**: Administración del workspace (sin poder archivar)
- **EDITOR**: Creación y edición de contenido
- **OPERATOR**: Operaciones y lectura
- **VIEWER**: Solo lectura

### 3.2 Capacidades por Rol

| Capacidad | SuperAdmin | PlatformAdmin | TenantOwner | TenantAdmin | WS Owner | WS Admin | WS Editor | WS Operator | WS Viewer |
|-----------|:----------:|:-------------:|:-----------:|:-----------:|:--------:|:--------:|:---------:|:-----------:|:---------:|
| Administrar plataforma | ✓ | Limitado | - | - | - | - | - | - | - |
| Crear tenants | ✓ | - | - | - | - | - | - | - | - |
| Ver todos los tenants | ✓ | ✓ | - | - | - | - | - | - | - |
| Configurar tenant | - | - | ✓ | - | - | - | - | - | - |
| Crear workspaces | - | - | ✓ | ✓ | - | - | - | - | - |
| Archivar workspace | - | - | - | - | ✓ | - | - | - | - |
| Configurar workspace | - | - | - | - | ✓ | ✓ | - | - | - |
| Gestionar miembros | - | - | - | - | ✓ | ✓ | - | - | - |
| Crear plantillas | - | - | - | - | ✓ | ✓ | ✓ | - | - |
| Editar borradores | - | - | - | - | ✓ | ✓ | ✓ | - | - |
| Publicar versiones | - | - | - | - | ✓ | ✓ | - | - | - |
| Ver contenido | - | - | - | - | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 4. Módulos Funcionales

### 4.1 Gestión de Tenants (Organizaciones)

**Propósito**: Administrar las organizaciones que usan la plataforma.

**Funcionalidades**:
- Listar tenants disponibles para el usuario
- Crear nuevo tenant (solo administradores de sistema)
- Buscar tenants por nombre o código
- Seleccionar tenant activo para trabajar
- Cambiar entre tenants asignados

**Consideraciones**:
- Existe un tenant especial "SYSTEM" para plantillas globales de la plataforma
- Un usuario puede pertenecer a múltiples tenants con diferentes roles
- El sistema registra el acceso a cada tenant

---

### 4.2 Gestión de Workspaces (Espacios de Trabajo)

**Propósito**: Organizar el trabajo dentro de un tenant en espacios independientes.

**Funcionalidades**:
- Listar workspaces del tenant actual
- Crear nuevo workspace
- Buscar workspaces por nombre
- Ver detalles del workspace (tipo, estado, documentos)
- Seleccionar workspace activo

**Tipos de Workspace**:
- **SYSTEM**: Para plantillas globales/reutilizables
- **CLIENT**: Para documentos específicos de clientes

**Consideraciones**:
- Un usuario puede tener diferentes roles en diferentes workspaces
- El sistema registra el acceso a cada workspace
- Los workspaces pueden contener carpetas, plantillas y tags propios

---

### 4.3 Gestión de Plantillas (Templates)

**Propósito**: Crear y administrar plantillas de documentos reutilizables.

#### Funcionalidades de Plantillas:
- Listar plantillas con filtros (carpeta, tags, búsqueda)
- Crear nueva plantilla
- Editar metadatos (título, carpeta, visibilidad)
- Clonar plantilla existente
- Eliminar plantilla
- Asignar/desasignar tags
- Marcar como plantilla de biblioteca pública

#### Funcionalidades de Versiones:
- Ver historial de versiones de una plantilla
- Crear nueva versión en blanco
- Crear versión desde una existente (copia)
- Editar contenido de versión borrador
- Eliminar versión borrador
- Publicar versión (hacerla oficial)
- Archivar versión (retirar de uso)
- Programar publicación futura
- Programar archivación futura
- Cancelar programaciones pendientes

**Ciclo de Vida de Versiones**:
```
DRAFT (Borrador) → PUBLISHED (Publicada) → ARCHIVED (Archivada)
```

**Consideraciones**:
- Solo puede haber una versión publicada por plantilla
- Las versiones publicadas/archivadas son de solo lectura
- Las versiones borrador permiten edición completa

---

### 4.4 Organización con Carpetas (Folders)

**Propósito**: Estructurar las plantillas en una jerarquía de carpetas.

**Funcionalidades**:
- Listar carpetas del workspace
- Ver árbol jerárquico de carpetas
- Crear carpeta (en raíz o dentro de otra)
- Renombrar carpeta
- Mover carpeta a otro padre
- Eliminar carpeta (debe estar vacía)

**Consideraciones**:
- Soporta anidación múltiple (carpetas dentro de carpetas)
- Las plantillas pueden asignarse a una carpeta o estar en raíz
- Una carpeta no puede eliminarse si contiene plantillas o subcarpetas

---

### 4.5 Etiquetado (Tags)

**Propósito**: Categorizar y filtrar plantillas mediante etiquetas.

**Funcionalidades**:
- Listar tags del workspace con contador de uso
- Crear nuevo tag
- Editar nombre/color del tag
- Eliminar tag
- Asignar tags a plantillas
- Filtrar plantillas por tags

**Consideraciones**:
- Una plantilla puede tener múltiples tags
- Los tags son específicos de cada workspace
- Se muestra el conteo de plantillas por tag

---

### 4.6 Variables Dinámicas (Injectables)

**Propósito**: Definir campos dinámicos que se reemplazan al generar documentos.

**Tipos de Variables**:
| Tipo | Descripción |
|------|-------------|
| **TEXT** | Texto libre |
| **NUMBER** | Valor numérico |
| **DATE** | Fecha |
| **CURRENCY** | Valor monetario |
| **BOOLEAN** | Verdadero/Falso |
| **IMAGE** | Imagen |
| **TABLE** | Tabla de datos |

**Funcionalidades**:
- Listar variables disponibles en el workspace
- Insertar variable en el documento
- Configurar formato (decimales, moneda, formato de fecha)

**Fuentes de Datos**:
- **INTERNAL**: Generada por el sistema (ej: fecha actual)
- **EXTERNAL**: Proporcionada externamente al generar documento

**Consideraciones**:
- Las variables pueden ser globales al workspace
- Cada variable tiene un identificador único (key)
- El formato se configura mediante metadata

---

### 4.7 Roles de Firmantes (Signer Roles)

**Propósito**: Definir los participantes y flujo de firma del documento.

**Funcionalidades**:
- Definir roles de firmantes (ej: "Cliente", "Vendedor", "Testigo")
- Configurar datos del firmante:
  - Nombre: fijo o variable (injectable)
  - Email: fijo o variable (injectable)
- Establecer orden de firma
- Configurar workflow de firma

**Configuración del Workflow**:
- **Modo Paralelo**: Todos firman simultáneamente
- **Modo Secuencial**: Firman en orden definido

**Notificaciones**:
- Configuración global o individual por rol
- Triggers configurables (envío inicial, recordatorios, completado)

---

### 4.8 Editor de Documentos

**Propósito**: Editar el contenido de las plantillas de forma visual.

**Funcionalidades**:
- Edición de texto enriquecido (WYSIWYG)
- Formateo: negrita, cursiva, listas, encabezados
- Inserción de variables dinámicas
- Inserción de imágenes
- Vista de paginación del documento
- Guardado automático de cambios
- Guardado manual bajo demanda

**Indicadores de Estado**:
- Guardando cambios
- Cambios guardados
- Error al guardar

**Consideraciones**:
- Solo versiones en borrador son editables
- El auto-guardado evita pérdida de trabajo
- Soporta contenido estructurado (JSON) y formatos legacy

---

### 4.9 Generación de Documentos

**Propósito**: Generar documentos finales con datos inyectados.

**Funcionalidades**:
- Generar preview PDF con valores de prueba
- Inyectar valores reales en las variables
- Obtener documento final

**Consideraciones**:
- Requiere versión publicada de la plantilla
- Los valores se mapean por ID de variable

---

### 4.10 Administración de Sistema

**Propósito**: Gestionar la plataforma a nivel global (solo administradores).

**Funcionalidades**:
- Dashboard de administración con estadísticas
- Gestión de tenants de la plataforma
- Gestión de usuarios con roles de sistema
- Asignar/revocar roles de sistema
- Visualización de logs de auditoría (planificado)
- Configuración de plataforma (planificado)

---

## 5. Flujos Principales del Usuario

### 5.1 Flujo de Acceso
1. Usuario se autentica
2. Selecciona un tenant (si tiene acceso a múltiples)
3. Ve lista de workspaces disponibles
4. Selecciona un workspace para trabajar
5. Accede a plantillas, documentos o configuración

### 5.2 Flujo de Creación de Plantilla
1. Navega a la sección de plantillas
2. Opcionalmente selecciona o crea una carpeta
3. Crea nueva plantilla
4. Edita contenido en el editor
5. Inserta variables dinámicas según necesidad
6. Define roles de firmantes
7. Configura workflow de firma
8. Guarda como borrador
9. Revisa y publica cuando está lista

### 5.3 Flujo de Versionamiento
1. Abre plantilla existente
2. Crea nueva versión (desde cero o copiando)
3. Modifica el contenido en borrador
4. Prueba con preview
5. Publica cuando está lista
6. La versión anterior puede archivarse

### 5.4 Flujo de Generación de Documento
1. Selecciona plantilla con versión publicada
2. Sistema solicita valores para las variables
3. Se genera el documento con datos inyectados
4. Se envía a los firmantes según workflow

---

## 6. Características Transversales

### 6.1 Multi-tenancy
- Aislamiento completo entre organizaciones
- Cada tenant tiene sus propios workspaces, usuarios y datos
- Usuarios pueden pertenecer a múltiples tenants

### 6.2 Internacionalización
- Soporte para múltiples idiomas
- Actualmente: Español e Inglés
- Extensible a más idiomas

### 6.3 Temas
- Soporte para tema claro y oscuro
- Preferencia persistente del usuario
- Detección de preferencia del sistema

### 6.4 Persistencia de Contexto
- El sistema recuerda el último tenant/workspace usado
- Sesión persiste entre recargas

### 6.5 Auditoría (Planificado)
- Registro de actividad de usuarios
- Tracking de cambios en datos
- Eventos de seguridad

---

## 7. Resumen de Entidades

| Entidad | Descripción | Relaciones |
|---------|-------------|------------|
| **Tenant** | Organización cliente | Contiene múltiples Workspaces |
| **Workspace** | Espacio de trabajo | Pertenece a un Tenant; contiene Folders, Templates, Tags |
| **Folder** | Carpeta organizativa | Pertenece a un Workspace; puede contener subcarpetas y Templates |
| **Template** | Plantilla de documento | Pertenece a un Workspace y opcionalmente a un Folder; tiene múltiples Versions y Tags |
| **Version** | Versión de plantilla | Pertenece a un Template; tiene Injectables y SignerRoles |
| **Tag** | Etiqueta | Pertenece a un Workspace; se asocia a múltiples Templates |
| **Injectable** | Variable dinámica | Pertenece a un Workspace; se usa en Versions |
| **SignerRole** | Rol de firmante | Pertenece a una Version |
| **User** | Usuario del sistema | Tiene roles en Sistema, Tenants y Workspaces |

---

## 8. Puntos de Extensión

El sistema está preparado para:
- Nuevos tipos de variables (injectables)
- Integraciones con sistemas externos de firma
- Workflows de aprobación más complejos
- Generación de múltiples formatos de salida
- Plantillas compartidas entre workspaces
- Analytics y reportes de uso

---

## 9. Directrices de Diseño

### 9.1 Filosofía General

El nuevo diseño debe alejarse de los patrones convencionales de interfaces empresariales sin sacrificar usabilidad. Buscamos una identidad visual distintiva que se sienta fresca, moderna y memorable.

### 9.2 Principios de Diseño

| Principio | Descripción |
|-----------|-------------|
| **Minimalismo funcional** | Cada elemento debe justificar su existencia. Eliminar decoración innecesaria. |
| **Ruptura con lo convencional** | Evitar dashboards genéricos, sidebars tradicionales y layouts predecibles. Explorar nuevas formas de organizar la información. |
| **UX como prioridad absoluta** | La innovación visual nunca debe comprometer la experiencia del usuario. La interfaz debe ser intuitiva y eficiente. |
| **Jerarquía clara** | A pesar de la innovación, la información debe ser fácil de escanear y las acciones principales deben ser evidentes. |
| **Consistencia interna** | El sistema de diseño debe ser coherente, aunque sea no convencional. |

### 9.3 Objetivos Específicos

**Lo que buscamos:**
- Identidad visual única y reconocible
- Espacios generosos y respiración visual
- Microinteracciones sutiles pero significativas
- Navegación fluida e intuitiva
- Reducción de ruido cognitivo
- Enfoque en el contenido, no en el chrome

**Lo que evitamos:**
- Dashboards con grids de tarjetas genéricas
- Sidebars con íconos + texto convencionales
- Headers pesados con demasiadas opciones
- Formularios con campos apilados sin creatividad
- Tablas de datos sin personalidad
- Paletas de colores corporativas aburridas

### 9.4 Consideraciones UX

A pesar de la búsqueda de diferenciación, el diseño debe:

- Mantener tiempos de aprendizaje mínimos
- Ofrecer feedback claro en todas las acciones
- Soportar flujos de trabajo eficientes
- Ser accesible (WCAG 2.1 AA mínimo)
- Funcionar correctamente en diferentes resoluciones
- Permitir personalización del usuario (tema claro/oscuro)

### 9.5 Inspiración

Buscar referencias en:
- Herramientas de diseño (Figma, Framer)
- Aplicaciones de productividad innovadoras (Linear, Notion, Arc)
- Interfaces de edición de contenido
- Diseño editorial y tipográfico

---

*El objetivo final es crear una interfaz que los usuarios recuerden y disfruten usar, no solo una herramienta funcional más.*
