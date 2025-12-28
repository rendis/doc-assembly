# Doc Assembly - Web Client

Este proyecto es el cliente web para la plataforma **Doc Assembly**, construido con un stack moderno enfocado en rendimiento, escalabilidad y una experiencia de desarrollo robusta y fuertemente tipada.

## 🛠 Tech Stack

### Core
*   **[React](https://react.dev/)** (v18+) - Biblioteca de UI.
*   **[Vite](https://vitejs.dev/)** - Build tool y entorno de desarrollo ultra-rápido.
*   **[TypeScript](https://www.typescriptlang.org/)** - Lenguaje principal (Strict Mode activado).

### Estilos & UI
*   **[Tailwind CSS](https://tailwindcss.com/)** (v3.4) - Framework de utilidades CSS.
*   **[shadcn/ui](https://ui.shadcn.com/)** - Colección de componentes reutilizables (basados en Radix UI y Tailwind).
    *   *Nota:* Los componentes base residen en `src/components/ui`.
*   **Utilerías:** `clsx`, `tailwind-merge`, `cva` (para variantes de componentes).

### Estado, Routing & Edición
*   **[TanStack Router](https://tanstack.com/router/latest)** - Enrutamiento moderno, *type-safe* y basado en archivos.
*   **[Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)** - Gestión de estado global minimalista y escalable.
*   **[Tiptap](https://tiptap.dev/)** - Editor de texto enriquecido (Headless) altamente extensible.

---

## 🏗 Arquitectura del Proyecto

El proyecto sigue una **Feature-Based Architecture (Arquitectura por Funcionalidades)**. En lugar de separar archivos por su "tipo" técnico (todos los estilos juntos, todos los componentes juntos), los agrupamos por **dominio de negocio**.

### Estructura de Directorios (`src/`)

```text
src/
├── app/                  # (Opcional) Configuración global, providers raíz.
├── components/           # Componentes COMPARTIDOS globalmente
│   ├── ui/               # ⚠️ Componentes base de shadcn/ui. (No agregar lógica de negocio aquí).
│   ├── layout/           # Layouts globales (Headers, Sidebars, Footers).
│   └── common/           # Componentes genéricos propios (Loaders, ErrorBoundaries, Wrappers).
│
├── features/             # 🧠 EL CORAZÓN DE LA APP: Módulos de Negocio
│   ├── auth/             # Ejemplo: Módulo de Autenticación
│   │   ├── components/   # LoginForm, RegisterForm (solo usados aquí).
│   │   ├── hooks/        # useLogin, useAuth (lógica específica).
│   │   ├── api/          # authService.ts (endpoints específicos).
│   │   └── types/        # Tipos/Interfaces exclusivos de este módulo.
│   ├── documents/        # Ejemplo: Módulo de Gestión de Documentos.
│   └── ...
│
├── hooks/                # Hooks globales y genéricos (useClickOutside, useMediaQuery).
├── lib/                  # Configuración de librerías y utilidades puras (axios, utils.ts, validaciones).
│   └── utils.ts          # Utilidad 'cn' para clases condicionales (shadcn).
│
├── routes/               # 🚦 TanStack Router (File-based routing)
│   ├── __root.tsx        # Layout Raíz (Root Route).
│   ├── index.tsx         # Home page (Ruta '/').
│   ├── login.tsx         # Ruta '/login' (Importa componentes de features/auth).
│   └── ...
│
├── stores/               # Stores de Zustand GLOBALES (ThemeStore, UserSessionStore).
├── types/                # Tipos de TypeScript compartidos globalmente (DTOs genéricos, Enums globales).
└── main.tsx              # Punto de entrada de la aplicación.
```

---

## 📏 Estándares y Buenas Prácticas

### 1. Colocación (Co-location)
Mantén el código lo más cerca posible de donde se utiliza.
*   **Regla de oro:** Si un componente, hook o función *solo* se usa dentro de una funcionalidad específica (ej: "Crear Documento"), **debe** vivir dentro de `src/features/documents`.
*   Solo promueve código a carpetas globales (`src/components`, `src/hooks`) si se reutiliza en múltiples *features*.

### 2. Uso de Shadcn/ui
*   Instala componentes nuevos usando el CLI: `npx shadcn-ui@latest add [component-name]`.
*   Los archivos en `src/components/ui` son tuyos, pero trata de no modificar su lógica interna drásticamente para facilitar futuras actualizaciones.
*   Para personalizaciones complejas, crea un componente "wrapper" en `src/components/common` o dentro de tu *feature*.

### 3. Rutas vs. Features
*   `src/routes`: Define **DÓNDE** se muestra el contenido (URL, Layouts, lazy loading).
*   `src/features`: Define **QUÉ** se muestra y cómo funciona (Lógica, UI, Estado).
*   *Patrón:* Un archivo de ruta (ej: `routes/login.tsx`) debería ser "delgado", importando y renderizando el componente principal desde la feature (ej: `<LoginPage />` o `<LoginForm />`).

### 4. Gestión de Estado (Zustand)
*   **Estado Global:** Usa Zustand para datos que deben persistir a través de muchas rutas o componentes distantes (ej: Sesión de usuario, Tema Oscuro/Claro, Carrito de compras).
*   **Estado Local:** Prefiere siempre `useState` o `useReducer` para interacciones locales de un componente.
*   **Formularios:** Usa librerías como `react-hook-form` para el estado de formularios complejos, evitando el re-renderizado global.

### 5. TypeScript
*   **Strict Mode:** Siempre activado. No uses `any`.
*   **Tipos de API:** Define interfaces claras para las respuestas del backend.
*   **Path Aliases:** Usa el alias `@/` para importar desde `src/`.
    *   ✅ `import { Button } from "@/components/ui/button"`
    *   ❌ `import { Button } from "../../../components/ui/button"`

## 📡 API Documentation

La especificación Swagger/OpenAPI de las APIs del backend está disponible en:

```
../doc-engine/docs/swagger.json
```

Consulta este archivo para obtener información detallada sobre endpoints, parámetros, tipos de respuesta y modelos de datos.

---

## 🚀 Comandos Disponibles

*   `pnpm dev`: Inicia el servidor de desarrollo.
*   `pnpm build`: Compila la aplicación para producción.
*   `pnpm preview`: Previsualiza la build de producción localmente.
*   `pnpm lint`: Ejecuta el linter.
