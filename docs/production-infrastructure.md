# Infraestructura inicial de producción

## Decisión y presupuesto

La primera versión utilizará esta combinación:

| Componente      | Proveedor y ubicación                            |       Costo inicial estimado |
| --------------- | ------------------------------------------------ | ---------------------------: |
| API NestJS      | Cloud Run, Santiago (`southamerica-west1`)       | USD 0–5/mes con poco tráfico |
| PostgreSQL      | Cloud SQL, Santiago, `db-f1-micro`, 10 GB SSD    |    USD 11–13/mes más backups |
| Correo          | Resend; envío desde São Paulo si está disponible |           USD 0 inicialmente |
| Páginas legales | Firebase Hosting, CDN global                     |           USD 0 inicialmente |
| Dominio y DNS   | Cloudflare Registrar/DNS, según disponibilidad   |          Pago anual variable |
| Mapas y ruteo   | Google Maps Platform / Routes API                |       Variable según consumo |

El costo previsto para la infraestructura base es aproximadamente **USD 13–22
mensuales**, antes de impuestos, dominio y consumo significativo de Routes API.
Cloud SQL con CPU compartida no está cubierto por el SLA de Google; esta
configuración se acepta para un lanzamiento controlado y debe revisarse cuando
el uso o la disponibilidad exigida aumenten.

Cloud Run y Cloud SQL deben permanecer en la misma región. La API se conecta a
PostgreSQL mediante el socket Unix de Cloud SQL Auth Proxy: la conexión se cifra
automáticamente y no requiere publicar el puerto 5432 ni copiar certificados al
contenedor. La instancia puede conservar una IP pública para Cloud SQL Auth
Proxy, pero no debe tener redes autorizadas abiertas.

## Preparación incluida en el repositorio

- `Dockerfile` genera una imagen de producción sin los GeoJSON privados.
- `cloudbuild.yaml` construye y publica la imagen en Artifact Registry de
  Santiago.
- `deploy/gcp/cloud-run.env.yaml.example` contiene solo variables no secretas.
- `firebase.json` y `pnpm legal:build` preparan las páginas legales para
  Firebase Hosting sin guardar los datos personales generados en Git.
- `apps/backend/src/migrate.ts` permite ejecutar migraciones como un Cloud Run
  Job antes de actualizar el servicio.
- `DATABASE_SOCKET` selecciona el socket Unix; `DATABASE_URL` y TLS por TCP se
  conservan para desarrollo y portabilidad.
- `DATABASE_POOL_SIZE=4` limita a unas 12 las conexiones de la API cuando Cloud
  Run alcanza sus tres instancias máximas.
- `/api/v1/health` permite comprobar el servicio después del despliegue.
- Los secretos se entregan desde Secret Manager y nunca se almacenan en el
  repositorio ni en el archivo de variables.
- Los GeoJSON privados permanecen ignorados y no se incorporan a la imagen.
- La aplicación móvil no contiene SDK ni lógica publicitaria.

## 1. Cuenta, proyecto y presupuesto de Google Cloud

Esta sección es manual y se realiza una sola vez.

1. Crear o elegir un proyecto de Google Cloud y habilitar facturación. El ID del
   proyecto no debe contener datos personales innecesarios.
2. Proteger la cuenta principal con autenticación multifactor y añadir un método
   de recuperación.
3. En **Billing > Budgets & alerts**, crear un presupuesto mensual de USD 35 con
   avisos en USD 15, USD 25 y USD 35. Las alertas no detienen el consumo.
4. Instalar Google Cloud CLI y ejecutar:

```powershell
gcloud auth login
gcloud auth application-default login
gcloud config set project TU_PROJECT_ID
gcloud config set run/region southamerica-west1

gcloud services enable run.googleapis.com sqladmin.googleapis.com `
  cloudbuild.googleapis.com artifactregistry.googleapis.com `
  secretmanager.googleapis.com routes.googleapis.com
```

5. Usar las variables siguientes en cada nueva terminal. Sustituir el ID:

```powershell
$projectId = 'TU_PROJECT_ID'
$region = 'southamerica-west1'
$repository = 'collectigo'
$serviceAccount = "collectigo-run@$projectId.iam.gserviceaccount.com"
```

## 2. Artifact Registry y cuenta de servicio

Crear el repositorio privado de imágenes y una identidad exclusiva para la API:

```powershell
gcloud artifacts repositories create $repository `
  --repository-format docker `
  --location $region `
  --description 'Imágenes de producción de ColectiGO'

gcloud iam service-accounts create collectigo-run `
  --display-name 'ColectiGO Cloud Run'

gcloud projects add-iam-policy-binding $projectId `
  --member "serviceAccount:$serviceAccount" `
  --role roles/cloudsql.client

gcloud projects add-iam-policy-binding $projectId `
  --member "serviceAccount:$serviceAccount" `
  --role roles/secretmanager.secretAccessor

gcloud projects add-iam-policy-binding $projectId `
  --member "serviceAccount:$serviceAccount" `
  --role roles/logging.logWriter
```

El acceso a Secret Manager se concede inicialmente a nivel del proyecto para
simplificar el alta. Cuando el despliegue esté estable, puede reducirse a los
cuatro secretos concretos.

## 3. Cloud SQL en Santiago

Crear la base desde **Google Cloud Console > SQL > Create instance > PostgreSQL**
para evitar guardar la contraseña en el historial de PowerShell:

1. ID de instancia: `collectigo-db`.
2. PostgreSQL 15, para coincidir con el entorno local actual.
3. Región: `southamerica-west1`; disponibilidad: **Single zone**.
4. Edición Enterprise, CPU compartida `db-f1-micro`.
5. SSD de 10 GB y crecimiento automático habilitado.
6. Backups automáticos, recuperación a un punto en el tiempo y protección contra
   eliminación habilitados.
7. No añadir redes autorizadas (`0.0.0.0/0` nunca debe utilizarse).
8. Crear la base `collectigo` y el usuario `collectigo`.
9. Generar una contraseña larga y única, y guardarla en el gestor de
   contraseñas. No reutilizar la contraseña local `postgres`.

El servicio usa `DATABASE_POOL_SIZE=4`. Con `max-instances=3`, la API abre como
máximo unas 12 conexiones PostgreSQL, dejando margen para migraciones,
administración y tareas internas de Cloud SQL. No aumentar el pool ni el número
de instancias sin revisar conjuntamente el límite de conexiones y la capacidad
de `db-f1-micro`.

Obtener después el nombre de conexión:

```powershell
$connectionName = gcloud sql instances describe collectigo-db `
  --format 'value(connectionName)'
$connectionName
```

El resultado debe tener esta forma:
`TU_PROJECT_ID:southamerica-west1:collectigo-db`.

## 4. Secret Manager

Desde **Security > Secret Manager**, crear estos secretos y añadir su valor como
primera versión:

| Secreto                            | Contenido                                      |
| ---------------------------------- | ---------------------------------------------- |
| `collectigo-db-password`           | Contraseña del usuario PostgreSQL `collectigo` |
| `collectigo-firebase-private-key`  | Clave privada completa de Firebase Admin       |
| `collectigo-google-routes-api-key` | Key server-side restringida a Routes API       |
| `collectigo-resend-api-key`        | API key SMTP exclusiva de producción           |

No añadir estos valores a `.env.example`, al YAML de despliegue, a GitHub
Actions ni a comandos que queden guardados en el historial.

## 5. Google Routes

1. En **APIs & Services**, confirmar que **Routes API** está habilitada.
2. Crear una API key exclusiva para el backend. No reutilizar la clave Android
   de Maps SDK incluida en el APK.
3. En **API restrictions**, permitir únicamente **Routes API**.
4. Cloud Run no ofrece una IP de salida fija por defecto. En esta fase no usar
   restricción por IP: conservar la key en Secret Manager y controlar el riesgo
   mediante restricción de API y cuotas.
5. Configurar una cuota diaria conservadora y alertas de facturación. Aumentarla
   solo después de medir solicitudes reales.
6. No crear todavía un conector VPC y Cloud NAT únicamente para obtener IP fija;
   añadiría costo permanente fuera de la necesidad inicial.

El planificador preselecciona hasta ocho candidatos, pero normalmente consulta
datos externos solo para los cuatro que pueden llegar a mostrarse. Si una
caminata real invalida un finalista, consulta únicamente los candidatos de
reserva necesarios. En el peor caso normal de cuatro viajes con transbordo esto
supone hasta 12 cálculos peatonales y 8 cálculos con tráfico, más una consulta
peatonal si también se evalúa ir caminando. Configurar cuotas y alertas con esta
amplificación en mente; los ocho candidatos completos solo se intentan cuando
hay resultados inválidos.

## 6. Resend y correo

1. Crear la cuenta, activar MFA y añadir `mail.tudominio` en **Domains**.
2. Seleccionar São Paulo como región de envío si aparece disponible.
3. Copiar a Cloudflare los registros SPF y DKIM entregados por Resend.
4. Esperar a que el dominio figure como verificado.
5. Crear una API key exclusiva y almacenarla como
   `collectigo-resend-api-key` en Secret Manager.
6. Usar `ColectiGO <no-reply@mail.tudominio>` como remitente y el buzón dedicado
   del proyecto como `ROUTE_SUGGESTIONS_EMAIL`.
7. El buzón debe eliminar las sugerencias al cumplir 90 días. Hasta automatizar
   la regla, revisar y vaciar mensualmente también la papelera.

La región de envío no implica residencia regional del contenido: la política y
el registro interno deben mantener documentado el tratamiento internacional del
proveedor.

## 7. Variables no secretas

Crear el archivo local ignorado por Git:

```powershell
Copy-Item deploy/gcp/cloud-run.env.yaml.example `
  deploy/gcp/cloud-run.env.yaml
```

Editar `deploy/gcp/cloud-run.env.yaml` y reemplazar todos los valores de ejemplo.
En particular:

- `DATABASE_SOCKET` debe ser `/cloudsql/$connectionName`.
- `DATABASE_POOL_SIZE` debe conservarse en `4` para `db-f1-micro` y tres
  instancias máximas de Cloud Run.
- Los datos Firebase deben ser los de la cuenta de servicio ya utilizada.
- `GOOGLE_AUTH_WEB_CLIENT_ID` debe coincidir con mobile.
- `CORS_ORIGINS` no puede contener `*` en producción.
- Los correos y el dominio de Resend deben ser definitivos.

El archivo no contiene contraseñas, pero permanece ignorado porque representa la
configuración concreta del despliegue.

## 8. Construir la imagen

Desde la raíz del repositorio:

```powershell
gcloud builds submit --config cloudbuild.yaml .

$image = "${region}-docker.pkg.dev/$projectId/$repository/backend:latest"
```

`cloudbuild.yaml` usa Santiago y la etiqueta `latest` de forma predeterminada.
En despliegues posteriores conviene utilizar una etiqueta inmutable:

```powershell
$tag = Get-Date -Format 'yyyyMMdd-HHmmss'
gcloud builds submit --config cloudbuild.yaml `
  --substitutions "_TAG=$tag" .
$image = "${region}-docker.pkg.dev/$projectId/$repository/backend:$tag"
```

Si Cloud Build informa que no puede publicar en Artifact Registry, conceder
`Artifact Registry Writer` a la cuenta de servicio de compilación indicada en el
propio error; no conceder el rol a usuarios o identidades adicionales.

## 9. Ejecutar migraciones

El job usa la misma imagen que la API, pero ejecuta `dist/migrate.js` y termina.
Debe completarse antes de dirigir tráfico a una versión nueva:

```powershell
gcloud run jobs deploy collectigo-migrate `
  --image $image `
  --region $region `
  --service-account $serviceAccount `
  --set-cloudsql-instances $connectionName `
  --env-vars-file deploy/gcp/cloud-run.env.yaml `
  --set-secrets 'DATABASE_PASSWORD=collectigo-db-password:latest' `
  --command node `
  --args apps/backend/dist/migrate.js `
  --tasks 1 `
  --max-retries 1 `
  --task-timeout 10m

gcloud run jobs execute collectigo-migrate --region $region --wait
```

No continuar con el servicio si el job falla. Abrir sus logs, corregir la causa
y volver a ejecutarlo; no marcar migraciones manualmente como completadas.

## 10. Desplegar Cloud Run

La API debe ser pública porque permite planificación como invitado. La
autenticación y autorización de las funciones personales siguen ocurriendo en
NestJS/Firebase.

```powershell
gcloud run deploy collectigo-api `
  --image $image `
  --region $region `
  --service-account $serviceAccount `
  --set-cloudsql-instances $connectionName `
  --env-vars-file deploy/gcp/cloud-run.env.yaml `
  --set-secrets 'DATABASE_PASSWORD=collectigo-db-password:latest,FIREBASE_PRIVATE_KEY=collectigo-firebase-private-key:latest,GOOGLE_ROUTES_API_KEY=collectigo-google-routes-api-key:latest,SMTP_PASSWORD=collectigo-resend-api-key:latest' `
  --allow-unauthenticated `
  --ingress all `
  --cpu 1 `
  --memory 512Mi `
  --concurrency 40 `
  --timeout 60 `
  --min-instances 0 `
  --max-instances 3 `
  --port 8080

$serviceUrl = gcloud run services describe collectigo-api `
  --region $region `
  --format 'value(status.url)'

Invoke-RestMethod "$serviceUrl/api/v1/health"
```

El resultado debe incluir `status: ok`. Con `min-instances=0`, la primera
solicitud después de un periodo sin tráfico puede tardar más por arranque en
frío; es el intercambio elegido para mantener el presupuesto.

Cada instancia mantiene un pool máximo de cuatro conexiones. El límite de tres
instancias del comando anterior mantiene el total previsto de la API alrededor
de 12 conexiones simultáneas a PostgreSQL.

Santiago no admite el mapeo directo de dominio de Cloud Run. Para la primera
versión se utilizará la URL HTTPS `run.app`. Un dominio propio de API requerirá
posteriormente un balanceador HTTPS u otra capa compatible y una nueva revisión
de costo.

## 11. Importar las rutas privadas

Las migraciones están en la imagen, pero los GeoJSON se mantienen solo en el
equipo local. Para importarlos sin abrir PostgreSQL a Internet:

1. Descargar Cloud SQL Auth Proxy desde su página oficial y dejar
   `cloud-sql-proxy.exe` en una carpeta local segura.
2. Abrir una terminal y mantenerla ejecutándose:

```powershell
cloud-sql-proxy.exe --port 5433 $connectionName
```

3. En otra terminal, desde la raíz del proyecto:

```powershell
$secureDbPassword = Read-Host 'Contraseña de collectigo' -AsSecureString
$env:DATABASE_PASSWORD = [Net.NetworkCredential]::new('', $secureDbPassword).Password
$env:DATABASE_HOST = '127.0.0.1'
$env:DATABASE_PORT = '5433'
$env:DATABASE_USER = 'collectigo'
$env:DATABASE_NAME = 'collectigo'
$env:DATABASE_SSL = 'false'

pnpm.cmd --filter backend seed

Remove-Item Env:DATABASE_PASSWORD
Remove-Item Env:DATABASE_HOST
Remove-Item Env:DATABASE_PORT
Remove-Item Env:DATABASE_USER
Remove-Item Env:DATABASE_NAME
Remove-Item Env:DATABASE_SSL
$secureDbPassword = $null
```

4. Cerrar Cloud SQL Auth Proxy y comprobar mediante la API que aparece la
   cantidad esperada de rutas.

El proxy autentica y cifra la conexión. No se debe añadir la IP del equipo a
**Authorized networks**.

## 12. Páginas legales y build móvil

1. En Firebase Console, abrir el proyecto usado por ColectiGO y habilitar
   **Hosting**. Puede usarse el sitio predeterminado `PROJECT_ID.web.app`.
2. Confirmar en `apps/mobile/.env` los tres valores públicos usados para generar
   el sitio. No son secretos, pero el directorio generado queda ignorado por Git:

```dotenv
EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME=RESPONSABLE_PUBLICO
EXPO_PUBLIC_PRIVACY_EMAIL=privacidad@tudominio
EXPO_PUBLIC_SUPPORT_EMAIL=soporte@tudominio
```

3. Desde la raíz, generar y revisar `hosting/`:

```powershell
pnpm.cmd legal:build
```

El contenido de privacidad y términos se comparte con la app; así las versiones
móvil y web no se mantienen por separado. El comando genera:

- `/privacidad`
- `/terminos`
- `/eliminar-cuenta`

4. Instalar o ejecutar Firebase CLI de forma temporal, iniciar sesión y publicar
   primero en un canal de vista previa. Sustituir el ID del proyecto:

```powershell
pnpm.cmd dlx firebase-tools@latest login
pnpm.cmd dlx firebase-tools@latest hosting:channel:deploy legal-preview `
  --project TU_FIREBASE_PROJECT_ID
```

No ejecutar `firebase init`: `firebase.json` ya está preparado y no debe
sobrescribirse. Abrir la URL temporal y comprobar navegación, correos, textos y
el procedimiento de eliminación.

5. Publicar el canal principal cuando la revisión sea correcta:

```powershell
pnpm.cmd dlx firebase-tools@latest deploy --only hosting `
  --project TU_FIREBASE_PROJECT_ID
```

6. Opcionalmente, conectar un dominio propio desde **Firebase Hosting > Add
   custom domain**. Mantener Cloudflare como registrador/DNS y copiar exactamente
   los registros TXT/A indicados por Firebase. No activar geobloqueo, login ni
   una regla de Cloudflare que impida el acceso de Google Play.
7. Configurar en `apps/mobile/.env` y en el entorno `production` de EAS:

```dotenv
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://TU_SITIO/privacidad
EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://TU_SITIO/eliminar-cuenta
```

8. En el entorno `production` de EAS, configurar además:
   - `EXPO_PUBLIC_API_URL=$serviceUrl/api/v1`
   - correos públicos de privacidad y soporte.
   - configuración Firebase y OAuth.
   - `GOOGLE_MAPS_API_KEY` restringida al package y SHA-1 de Play App Signing.
9. No crear variables de AdMob ni declarar anuncios para esta versión.
10. Comprobar y generar el AAB:

```powershell
cd apps/mobile
pnpm.cmd dlx eas-cli@latest env:list --environment production
pnpm.cmd dlx eas-cli@latest build --platform android --profile production
```

## Procedimiento para cada despliegue posterior

1. Ejecutar pruebas y compilación local.
2. Construir una imagen con etiqueta inmutable.
3. Actualizar el job `collectigo-migrate` con esa imagen.
4. Ejecutar el job y esperar éxito.
5. Desplegar `collectigo-api` con exactamente la misma imagen.
6. Comprobar health, rutas, login, sugerencias y eliminación de cuenta.
7. Conservar temporalmente la etiqueta anterior para poder volver a desplegarla;
   una migración irreversible requiere además un plan propio de reversión.

## Verificación previa a Play Console

1. Health check y listado de rutas desde una red externa.
2. Planificación directa y con transbordo como invitado.
3. Registro, contraseña y Google Sign-In.
4. Envío real de una sugerencia y recepción en el buzón dedicado.
5. Eliminación de cuenta dentro de la app y solicitud desde la web.
6. Política y términos accesibles públicamente.
7. Ningún anuncio, permiso publicitario ni SDK de anuncios en el AAB.
8. Alertas de presupuesto y cuotas de Routes API activas.
9. Restauración de un backup probada antes del lanzamiento general.
10. Revisión semanal de costos, errores y capacidad durante el primer mes.

## Referencias operativas

- [Ubicaciones de Cloud Run](https://cloud.google.com/run/docs/locations)
- [Precios de Cloud Run](https://cloud.google.com/run/pricing)
- [Conectar Cloud Run con Cloud SQL](https://cloud.google.com/sql/docs/postgres/connect-run)
- [Ubicaciones de Cloud SQL](https://cloud.google.com/sql/docs/postgres/locations)
- [Precios de Cloud SQL](https://cloud.google.com/sql/pricing)
- [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [Secret Manager con Cloud Run](https://cloud.google.com/run/docs/configuring/services/secrets)
- [Resend SMTP](https://resend.com/docs/send-with-smtp)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Dominio personalizado en Firebase Hosting](https://firebase.google.com/docs/hosting/custom-domain)
- [Precios de Google Maps Platform](https://developers.google.com/maps/billing-and-pricing/pricing)
