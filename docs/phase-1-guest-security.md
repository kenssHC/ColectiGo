# Fase 1: modo invitado y seguridad de producción

## Alcance aplicado

- Mapa, rutas y planificador disponibles sin una cuenta.
- Login solicitado solamente para funciones personales.
- Retorno al formulario de sugerencias después de autenticarse.
- Cliente HTTP separado entre endpoints públicos y autenticados.
- Primera versión sin SDK publicitario ni anuncios.
- Selector de ruteo peatonal `osrm`, `google` o `none`.
- SMTP con TLS 1.2 como mínimo y TLS obligatorio en producción.
- Eliminación de cuenta local, identidades Google y Firebase Authentication.
- Validación estricta de variables cuando `NODE_ENV=production`.

No se añadieron migraciones ni dependencias nativas.

## Variables locales

En `apps/backend/.env` se recomienda declarar explícitamente:

```dotenv
WALK_ROUTING_PROVIDER=osrm
WALK_ROUTING_URL=https://routing.openstreetmap.de/routed-foot
SMTP_REQUIRE_TLS=true
```

El endpoint anterior es solo para desarrollo. El backend rechaza esa dirección
cuando `NODE_ENV=production`.

En `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_APP_ENV=development
```

## Prueba manual local

Después de reiniciar la computadora:

1. En la raíz, inicia PostgreSQL:

   ```powershell
   docker compose up -d
   ```

2. Inicia el backend en otra terminal:

   ```powershell
   pnpm backend
   ```

3. Inicia Metro en otra terminal:

   ```powershell
   pnpm mobile
   ```

4. Abre el development build instalado en Android.
5. Cierra la sesión si había una cuenta abierta.
6. Confirma que permaneces en el mapa y puedes calcular una ruta.
7. Abre Perfil; debe mostrarse el estado de invitado.
8. Pulsa **Enviar sugerencia de ruta**; debe abrirse el login.
9. Inicia sesión; la aplicación debe regresar al formulario de sugerencias.

No es necesario ejecutar migraciones ni generar otro APK para estos cambios.
Solo será necesario recompilar si posteriormente cambia una dependencia o
configuración nativa.

## Prueba de eliminación

Utiliza una cuenta temporal, no tu cuenta principal:

1. Inicia sesión nuevamente para que la autenticación tenga menos de cinco
   minutos.
2. Ve a Perfil y pulsa **Eliminar cuenta**.
3. Acepta las dos confirmaciones.
4. Comprueba que la app vuelve al mapa como invitado.
5. En Firebase Console, confirma que la cuenta ya no está en Authentication.
6. En PostgreSQL, opcionalmente confirma que ya no existe el usuario. No debes
   editar manualmente la base si la eliminación terminó correctamente.

Si han pasado más de cinco minutos desde el login, el backend pedirá volver a
iniciar sesión. Esto es intencional.

## Producción pendiente

Todavía no deben configurarse credenciales reales en el repositorio. La fase de
despliegue requerirá:

- `WALK_ROUTING_PROVIDER=google` y una `GOOGLE_ROUTES_API_KEY` restringida, o un
  OSRM privado con HTTPS.
- Orígenes CORS específicos; `*` es rechazado.
- PostgreSQL administrado mediante `DATABASE_URL` o variables individuales, con
  `DATABASE_SSL` según la red del proveedor.
- SMTP dedicado con usuario, contraseña y `SMTP_REQUIRE_TLS=true`.
- `EXPO_PUBLIC_APP_ENV=production` y ausencia del SDK publicitario.
- Una URL pública externa para solicitar eliminación de cuenta, exigida por
  Google Play además del botón incluido en la app.
