# ColectiGO

Aplicativo móvil para consultar rutas de colectivos, autos y buses en la ciudad de Huancayo.

## Estructura del proyecto

```
ColectiGO/
├── apps/
│   ├── mobile/     # React Native + Expo + TypeScript
│   └── backend/    # NestJS + TypeScript
├── packages/
│   └── shared/     # Tipos e interfaces compartidas
├── pnpm-workspace.yaml
└── package.json
```

## Requisitos previos

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ con extensión PostGIS
- Cuenta de Firebase con Authentication habilitado
- API Key de Google Maps Platform

## Configuración

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno del backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edita `apps/backend/.env` con tus credenciales reales:

| Variable | Descripción |
|---|---|
| `DATABASE_HOST` | Host de PostgreSQL |
| `DATABASE_PORT` | Puerto de PostgreSQL (por defecto 5432) |
| `DATABASE_USER` | Usuario de PostgreSQL |
| `DATABASE_PASSWORD` | Contraseña de PostgreSQL |
| `DATABASE_NAME` | Nombre de la base de datos |
| `FIREBASE_PROJECT_ID` | ID del proyecto en Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | Client email del service account de Firebase |
| `FIREBASE_PRIVATE_KEY` | Private key del service account de Firebase |
| `GOOGLE_MAPS_API_KEY` | API Key de Google Maps Platform |

### 3. Configurar variables de entorno del mobile

Crea `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

### 4. Configurar Google Maps en la app

Agrega tu API Key en `apps/mobile/app.json` en los campos:
- `expo.ios.config.googleMapsApiKey`
- `expo.android.config.googleMaps.apiKey`

### 5. Configurar Firebase en la app

Descarga el archivo `google-services.json` desde Firebase Console y colócalo en `apps/mobile/`.

## Desarrollo

### Iniciar el backend

```bash
pnpm backend
```

El servidor corre en `http://localhost:3000`

### Iniciar la app mobile

```bash
pnpm mobile
```

Escanea el QR con Expo Go o ejecuta en un emulador.

## Base de datos

El backend utiliza TypeORM con `synchronize: true` en modo desarrollo, lo que crea las tablas automáticamente al iniciar. En producción se deben usar migraciones.

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/users/sync` | Sincroniza usuario de Firebase con la base de datos |
| `GET` | `/api/v1/users/me` | Obtiene el perfil del usuario autenticado |
| `GET` | `/api/v1/routes` | Lista todas las rutas activas |
| `GET` | `/api/v1/routes/:id` | Obtiene una ruta por ID |
| `POST` | `/api/v1/routes` | Crea una ruta de transporte |
| `POST` | `/api/v1/routes/:id/suggestions` | Envía una sugerencia de corrección |
| `POST` | `/api/v1/planner/calculate` | Calcula las rutas entre dos puntos |

### Ejemplo: Calcular ruta

```json
POST /api/v1/planner/calculate
{
  "origin": { "lat": -12.0651, "lng": -75.2049 },
  "destination": { "lat": -12.0800, "lng": -75.2100 }
}
```

La respuesta incluye tres opciones: `shortest` (más corta), `fastest` (menos tiempo) y `cheapest` (más barata), cada una con pasos detallados.
