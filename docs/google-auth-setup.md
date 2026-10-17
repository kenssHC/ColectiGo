# Configuración manual de Google Sign-In

ColectiGO valida Google en el backend y después crea una sesión Firebase mediante
un Custom Token. El proveedor Google **no necesita habilitarse dentro de Firebase
Authentication** y el mobile no usa `GoogleAuthProvider.signInWithCredential`.
Esto permite que el backend controle explícitamente la creación y vinculación de
identidades.

## 1. Google Cloud

Usa el mismo proyecto de Google Cloud asociado al proyecto Firebase actual.

1. Abre **Google Cloud Console → APIs y servicios → Pantalla de consentimiento OAuth**.
2. Configura nombre de la aplicación, correo de soporte y datos de contacto.
3. Durante pruebas, agrega las cuentas que usarás como usuarios de prueba si la
   aplicación sigue en modo `Testing`.
4. En **Credenciales**, crea un **OAuth Client ID → Aplicación web**. No necesita
   redirect URI para el flujo nativo usado por Android.
5. Copia ese Web Client ID; normalmente termina en
   `.apps.googleusercontent.com`.
6. Crea además un **OAuth Client ID → Android** con:
   - Package name: `com.collectigo.app`.
   - SHA-1 del certificado que firma el development build de EAS.
7. Antes de publicar, agrega otro cliente Android o los fingerprints necesarios
   para la clave de producción y para **Google Play App Signing**.

El Client ID Web es un identificador público. Nunca agregues un OAuth Client
Secret al mobile.

## 2. Obtener el SHA-1 de EAS

Desde `apps/mobile` ejecuta:

```powershell
pnpm dlx eas-cli@latest credentials --platform android
```

Selecciona el perfil/keystore usado por el build y consulta su SHA-1. También
puedes verlo en Expo Dashboard, dentro de las credenciales Android del proyecto.

Cada certificado distinto necesita estar registrado en Google Cloud: desarrollo,
preview/producción y, al publicar, la clave administrada por Google Play.

## 3. Variables locales

En `apps/backend/.env` agrega:

```env
GOOGLE_AUTH_WEB_CLIENT_ID=000000000000-xxxxxxxx.apps.googleusercontent.com
```

En `apps/mobile/.env` agrega exactamente el mismo identificador:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=000000000000-xxxxxxxx.apps.googleusercontent.com
```

No uses aquí `GOOGLE_MAPS_API_KEY` ni `GOOGLE_ROUTES_API_KEY`.

## 4. Variables en EAS y despliegue

Configura `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en los entornos EAS que vayas a
compilar (`development`, `preview` y `production`). Configura
`GOOGLE_AUTH_WEB_CLIENT_ID` en el entorno donde se despliegue el backend.

El backend necesita además que su service account Firebase actual tenga permiso
para crear Custom Tokens. Las credenciales actuales basadas en
`FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` normalmente ya lo permiten.

## 5. Base de datos

Con PostgreSQL y el backend configurados, aplica la nueva migración una vez:

```powershell
pnpm --filter backend migration:run
```

La migración solo crea `auth_identities`; no modifica ni elimina usuarios
existentes.

## 6. Nuevo development build

La dependencia Google Sign-In contiene código nativo. Genera e instala una APK
nueva:

```powershell
cd apps/mobile
pnpm dlx eas-cli@latest build --platform android --profile development
```

Después de instalarla, para el trabajo cotidiano vuelve a usar, desde la raíz:

```powershell
docker compose up -d
pnpm --filter backend migration:run
pnpm backend
pnpm mobile
```

Expo Go no puede ejecutar este inicio de sesión.

## 7. Comprobación funcional

1. Prueba una cuenta Google que nunca haya usado ColectiGO: debe crearse e
   ingresar directamente.
2. Prueba un correo ya registrado con contraseña: la app debe pedir esa
   contraseña y conservar el mismo usuario.
3. Cierra sesión y vuelve a entrar con Google: ya no debe pedir la contraseña.
4. Comprueba en Perfil que aparezca `Google` o `Google + contraseña`.

Si aparece un error de configuración/developer, revisa primero que coincidan el
package, el SHA-1 del APK instalado y el proyecto que emitió el Web Client ID.

## iOS futuro

Para iOS crea un OAuth Client ID de tipo iOS para `com.collectigo.app` y define
en EAS `GOOGLE_IOS_URL_SCHEME` con su `REVERSED_CLIENT_ID`, por ejemplo:

```env
GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.000000000000-xxxx
```

Al definirlo, `app.config.js` activa el config plugin que agrega el URL scheme y
las dependencias nativas de iOS.
