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
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## Requisitos previos

- Node.js 20+
- pnpm 10+
- Docker (opcional, para PostgreSQL local) o PostgreSQL 15+
- Cuenta de Firebase con Authentication (Email/Password) habilitado

## Configuración

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Levantar PostgreSQL (recomendado)

```bash
docker compose up -d
```

Esto crea el contenedor `collectigo-postgres` con usuario/contraseña `postgres` y base `collectigo`.

### 3. Configurar variables de entorno del backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

| Variable                      | Descripción                                                      |
| ----------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` / `DATABASE_*` | Conexión a PostgreSQL; la URL tiene prioridad                    |
| `DATABASE_SOCKET`             | Socket Unix de Cloud SQL cuando se despliega en Cloud Run        |
| `DATABASE_SSL*`               | TLS, validación y CA opcional para conexiones TCP                |
| `DATABASE_POOL_SIZE`          | Conexiones PostgreSQL por proceso (`4` en Cloud Run inicial)     |
| `FIREBASE_PROJECT_ID`         | ID del proyecto en Firebase Console                              |
| `FIREBASE_CLIENT_EMAIL`       | Client email del service account                                 |
| `FIREBASE_PRIVATE_KEY`        | Private key del service account (con `\n` escapados)             |
| `GOOGLE_AUTH_WEB_CLIENT_ID`   | OAuth Client ID Web para validar tokens de Google                |
| `CORS_ORIGINS`                | Orígenes permitidos separados por coma (`*` solo en desarrollo)  |
| `WALK_ROUTING_PROVIDER`       | `osrm`, `google` o `none`; producción no admite `none`           |
| `WALK_ROUTING_URL`            | Endpoint de OSRM propio/proveedor; el público es solo desarrollo |
| `GOOGLE_ROUTES_API_KEY`       | Key server-side de Routes API para calcular tiempos con tráfico  |
| `ROUTE_SUGGESTIONS_EMAIL`     | Correo administrativo que recibe sugerencias nuevas              |
| `SMTP_*`                      | Servidor, credenciales, TLS y remitente usados solo por backend  |

El backend valida las credenciales de Firebase al arrancar. En producción también
requiere la configuración SMTP. Las sugerencias se envían por correo y no se guardan
en PostgreSQL. La tabla histórica se conserva vacía para un posible uso futuro.

### 4. Migraciones e importación de rutas

```bash
pnpm --filter backend migration:run
pnpm --filter backend seed   # importa las rutas desde apps/backend/src/seeds/data/*.geojson
```

El esquema se gestiona exclusivamente con migraciones (`synchronize` está desactivado).

Las rutas reales se cargan desde archivos GeoJSON (uno o más `Feature` de tipo
`LineString`, por ejemplo trazados en [geojson.io](https://geojson.io)) con estas
`properties`: `empresa`, `codigo_empresa` (único, ej. TR-0024), `flota`,
`tipo` (ej. TA-11; el prefijo define el vehículo: TA=colectivo, TC=combi, TM=bus),
`tarifa`, `paradero_inicio`, `paradero_fin`, `direccion` (`ida` o `vuelta`,
opcionalmente `con bifurcación`) e `imagen` (URL HTTPS opcional de una foto
referencial del vehículo). Para las tarjetas de resultados se recomienda una imagen
horizontal o cuadrada, de al menos 320 px en su lado menor, comprimida a menos de
100 KB y servida desde un CDN. El vehículo debe estar centrado y el cartel frontal,
si existe, debe ser legible. Las rutas sin imagen muestran un identificador visual
con su código y color, por lo que la fotografía nunca sustituye al texto.
El importador es idempotente: puede ejecutarse varias veces y reemplaza los
recorridos existentes. No hay paraderos intermedios: los pasajeros suben y bajan
en cualquier punto del recorrido, y el planner calcula el punto exacto.

### 5. Configurar variables de entorno del mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable                             | Descripción                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                | URL del backend. En dispositivo físico usa la IP LAN (ej. `http://192.168.1.10:3000/api/v1`) |
| `EXPO_PUBLIC_FIREBASE_*`             | Configuración web de Firebase (Consola → Configuración del proyecto → Tus apps)              |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`   | OAuth Client ID Web usado por Google Sign-In; debe coincidir con el backend                  |
| `EXPO_PUBLIC_APP_ENV`                | Entorno funcional: `development`, `preview` o `production`                                   |
| `EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME` | Nombre público del responsable del tratamiento                                               |
| `EXPO_PUBLIC_PRIVACY_EMAIL`          | Correo público para privacidad y ejercicio de derechos                                       |
| `EXPO_PUBLIC_SUPPORT_EMAIL`          | Correo público de soporte                                                                    |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`     | Política de privacidad HTML pública mediante HTTPS                                           |
| `EXPO_PUBLIC_ACCOUNT_DELETION_URL`   | Recurso web externo HTTPS para solicitar eliminación                                         |

### 5.1 Uso como invitado

El mapa, el listado de rutas y el planificador pueden utilizarse sin crear una
cuenta. La autenticación se solicita al abrir funciones personales, como enviar
una sugerencia. Después de iniciar sesión, la app regresa automáticamente a la
función que originó la solicitud.

La eliminación de cuenta está disponible desde Perfil y requiere que el último
inicio de sesión tenga menos de cinco minutos. El proceso elimina el usuario
local, sus identidades vinculadas y la cuenta de Firebase Authentication.

La prueba manual y las variables de esta fase están documentadas en
[`docs/phase-1-guest-security.md`](docs/phase-1-guest-security.md).

### 5.2 Inicio de sesión con Google

Google Sign-In usa Android Credential Manager, valida el ID token en el backend
y crea una sesión Firebase mediante Custom Token. Las identidades externas se
guardan en `auth_identities`; nunca se vinculan cuentas únicamente por coincidencia
de correo.

Configura `GOOGLE_AUTH_WEB_CLIENT_ID` en el backend y
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en mobile con el mismo OAuth Client ID de tipo
Web. Android requiere además un OAuth Client ID propio para el package
`com.collectigo.app` y el SHA-1 de cada certificado de firma.

Consulta la guía completa y los pasos de EAS en
[`docs/google-auth-setup.md`](docs/google-auth-setup.md).

### 5.3 Privacidad y términos

La Política de privacidad y los Términos de uso se pueden consultar sin iniciar
sesión desde Login, Registro y Perfil. El formulario de sugerencias muestra antes
del envío qué datos se remiten por correo. Una build de producción se bloquea si
faltan los correos públicos o las URLs HTTPS exigidas para publicación.

La configuración, retención aprobada, publicación web y prueba manual están en
[`docs/phase-2-legal-privacy.md`](docs/phase-2-legal-privacy.md).
Las páginas web se generan desde el mismo contenido de la app con
`pnpm legal:build` y se publican en Firebase Hosting.

La infraestructura inicial de producción, el presupuesto y el procedimiento de
alta manual están en
[`docs/production-infrastructure.md`](docs/production-infrastructure.md).

### 6. Google Maps y development build

El mapa usa `react-native-maps`. Google Maps ya no funciona dentro de Expo Go
para Android, por lo que el desarrollo de las pantallas de mapas requiere un
development build propio.

Agrega la clave de Android a `apps/mobile/.env` (este archivo está ignorado por Git):

```bash
GOOGLE_MAPS_API_KEY=tu_clave
```

La clave debe tener habilitado **Maps SDK for Android** y estar restringida al
package `com.collectigo.app` y al SHA-1 del certificado que firma el build.
`apps/mobile/app.config.js` la entrega al plugin nativo de `react-native-maps`.
No reutilices esta clave en el backend: la key de Routes API necesita
restricciones server-side diferentes.

Para compilar e instalar localmente en un dispositivo conectado por USB:

```bash
pnpm mobile:android
```

Después del primer build, los cambios JavaScript/TypeScript no requieren recompilar:

```bash
pnpm mobile
```

Para crear un APK de desarrollo en EAS se usa el perfil `development` definido en
`apps/mobile/eas.json`. La variable `GOOGLE_MAPS_API_KEY` debe existir también en
el entorno `development` de EAS.

### 6.1 Primera versión sin publicidad

La primera versión de ColectiGO no incluye un SDK publicitario ni muestra
anuncios. Si se evalúa monetización en el futuro, requerirá una nueva revisión
de privacidad, experiencia de usuario y declaración en Google Play.

## Desarrollo

```bash
pnpm backend   # API en http://localhost:3000
pnpm mobile          # Metro para el development build instalado
pnpm mobile:android  # compila e instala el development build local
pnpm mobile:go       # Expo Go, solo para funciones que no dependan de Google Maps
```

Si editas `packages/shared`, recompílalo para que la app (Metro) y `nest build` vean los cambios:

```bash
pnpm --filter @collectigo/shared build
```

## Pruebas

```bash
pnpm --filter @collectigo/mobile test # pruebas de la aplicación móvil
pnpm --filter backend test       # unitarias
pnpm --filter backend test:e2e   # e2e ligeras (sin BD)
```

CI corre automáticamente en GitHub Actions (`.github/workflows/ci.yml`).

## Endpoints principales

Todos con prefijo `/api/v1`. Las respuestas de error incluyen `requestId` (`X-Request-Id`).

| Método   | Ruta                      | Auth                         | Descripción                                      |
| -------- | ------------------------- | ---------------------------- | ------------------------------------------------ |
| `GET`    | `/health`                 | —                            | Health check (sin rate limit)                    |
| `POST`   | `/users/sync`             | Token                        | Crea/recupera el usuario a partir del token      |
| `GET`    | `/users/me`               | Token                        | Perfil del usuario autenticado                   |
| `DELETE` | `/users/me`               | Token reciente               | Elimina la cuenta y sus identidades vinculadas   |
| `POST`   | `/auth/google`            | —                            | Valida Google y crea una sesión Firebase         |
| `POST`   | `/auth/google/link`       | Token reciente de contraseña | Vincula Google a la cuenta actual                |
| `GET`    | `/routes`                 | —                            | Lista rutas activas con sus recorridos           |
| `GET`    | `/routes/:id`             | —                            | Ruta por ID                                      |
| `POST`   | `/routes`                 | Token + admin                | Crea una ruta de transporte                      |
| `POST`   | `/routes/:id/suggestions` | Token                        | Envía una sugerencia por correo, sin persistirla |
| `POST`   | `/planner/calculate`      | —                            | Calcula rutas entre dos puntos (20 req/min)      |

### Ejemplo: Calcular ruta

```json
POST /api/v1/planner/calculate
{
  "origin": { "lat": -12.0651, "lng": -75.2049 },
  "destination": { "lat": -12.0800, "lng": -75.2100 },
  "mode": "balanced"
}
```

La respuesta incluye la mejor opción (`best`) según un costo generalizado estable,
más alternativas Pareto-óptimas y diversas. El costo separa tiempo en vehículo,
caminata, espera, transbordos y tarifa; `totalDistance` queda como información y
desempate, no como una penalización adicional. Los modos disponibles son
`balanced`, `fastest`, `cheapest`, `less_walking` y `fewer_transfers` (`shortest`
se conserva como alias heredado de `less_walking`).

Si el destino está cerca (< 2.5 km), se evalúa también la opción de ir caminando.
Las caminatas se trazan por las calles mediante el proveedor seleccionado en
`WALK_ROUTING_PROVIDER`: OSRM durante desarrollo o Google Routes API/modo `WALK`
en producción. Si se configura `GOOGLE_ROUTES_API_KEY`, cada tramo vehicular se
refina además con Google Routes API (`DRIVE` + `TRAFFIC_AWARE`). Sin key o ante
errores externos se usa una estimación local por distancia y hora punta. La key
del backend debe estar restringida a Routes API y, en despliegues con IP estable,
a la IP del servidor.

Se mantiene una cola diversa de hasta ocho candidatos, pero normalmente solo se
enriquecen los cuatro que pueden mostrarse. Los siguientes se consultan de forma
incremental únicamente si el recorrido peatonal real invalida algún finalista.
Las llamadas peatonales a Google y las de tráfico tienen un máximo de cuatro
solicitudes simultáneas por proceso.

El planificador admite rutas directas y viajes con un transbordo. La caminata
entre vehículos debe ser de 150 m o menos y se valida sobre el recorrido peatonal
real cuando OSRM está disponible. Cada abordaje cobra su propia tarifa. En rutas
TA/TAT, la tarifa base aplica hasta 5 km, aumenta S/ 0.50 entre más de 5 y 6 km,
y aumenta S/ 1.00 cuando el tramo supera 6 km.
