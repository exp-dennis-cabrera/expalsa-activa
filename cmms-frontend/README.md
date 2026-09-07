# CMMS Frontend

Frontend en React + TypeScript + Vite que consume el backend `cmms-api`.

## Requisitos

- Node.js 18+ (recomendado 20 LTS)
- El backend `cmms-api` corriendo en `http://localhost:8080` (ver su propio README)

## Cómo levantarlo

### 1. Instalar Node.js (si no lo tienes)

Descarga el instalador LTS desde https://nodejs.org — el instalador de Windows
agrega `node` y `npm` al PATH automáticamente. Verifica con:

```powershell
node --version
npm --version
```

### 2. Instalar dependencias

Dentro de la carpeta `cmms-frontend`:

```powershell
npm install
```

### 3. Configurar la URL del backend (opcional)

Por defecto apunta a `http://localhost:8080`. Si tu backend corre en otra
URL, copia `.env.example` a `.env` y ajusta `VITE_API_URL`.

### 4. Correr en modo desarrollo

```powershell
npm run dev
```

Abre `http://localhost:3000`. Inicia sesión con el usuario del seeder:
`admin@demo.com` / `password123`.

## Qué incluye este MVP

- Login que guarda el JWT en `localStorage` y lo agrega automáticamente
  a cada request (`src/api/client.ts`)
- Ruta protegida (`/work-orders`) que redirige a `/login` si no hay sesión
- Listado de Work Orders con paginación, filtro por estado, creación rápida
  y cambio de estado inline
- Manejo centralizado de errores del backend (`ApiRequestError`)
- Si el token expira (401), limpia la sesión y redirige a login automáticamente

## Estructura

```
src/
├── api/          → funciones que llaman al backend (fetch centralizado)
├── context/       → AuthContext (estado de sesión global)
├── components/    → componentes reutilizables (ProtectedRoute)
├── pages/         → LoginPage, WorkOrdersPage
├── types/         → tipos TypeScript que reflejan los DTOs del backend
└── styles.css     → identidad visual (paleta navy + amber, IBM Plex)
```

## Pendiente (siguientes pasos)

- [ ] Página de detalle de Work Order (asset, asignados, adjuntos)
- [ ] CRUD de Assets desde la UI
- [ ] Refresh token automático antes de que expire el access token
- [ ] Registro de organización desde la UI (hoy solo existe el endpoint)
