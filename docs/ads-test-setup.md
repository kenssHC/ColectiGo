# Publicidad de prueba en ColectiGO

La integración móvil usa `react-native-google-mobile-ads` y está bloqueada en
modo de prueba. Tanto los App ID nativos como la unidad interstitial son los
identificadores oficiales de prueba de Google; no generan ingresos.

## Comportamiento

- El cálculo del backend termina y se guarda antes de intentar publicidad.
- Si el anuncio no está cargado, falla o AdMob no tiene conexión, la app abre
  los resultados normalmente.
- Las dos primeras búsquedas exitosas después de instalar la app no muestran
  publicidad.
- Después se requieren tres búsquedas exitosas y 15 minutos desde la última
  impresión.
- Hay un máximo local de tres impresiones en 24 horas y la primera búsqueda de
  cada sesión queda libre.
- Las solicitudes son no personalizadas y no incluyen origen, destino ni GPS.

Para deshabilitar completamente la integración durante una prueba local:

```dotenv
EXPO_PUBLIC_ADS_ENABLED=false
```

Si la variable no existe, los anuncios de prueba están habilitados.

## Generar el nuevo development build

La dependencia contiene código nativo. El APK instalado antes de esta
integración no puede cargarla y debe reemplazarse.

Desde `apps/mobile`:

```powershell
pnpm dlx eas-cli@latest build --platform android --profile development
```

Descarga el APK de EAS, instálalo en el teléfono y sustituye la versión de
desarrollo anterior.

## Ejecutar el proyecto diariamente

Después de reiniciar el PC:

Terminal 1, desde la raíz del repositorio:

```powershell
docker compose up -d
```

Las migraciones y el seed no deben ejecutarse en cada inicio; solo cuando haya
migraciones nuevas o se necesite reconstruir los datos.

Terminal 2:

```powershell
pnpm backend
```

Terminal 3:

```powershell
pnpm mobile
```

Abre el development build de ColectiGO instalado, no Expo Go. El teléfono y la
PC deben poder comunicarse por la red local y `EXPO_PUBLIC_API_URL` debe apuntar
a la IP LAN de la PC.

## Verificar la publicidad

1. Calcula dos rutas exitosamente: no debe aparecer un anuncio.
2. En la tercera búsqueda exitosa puede aparecer el interstitial si terminó de
   precargarse.
3. El anuncio debe llevar la marca `Test Ad` o equivalente de Google.
4. Ciérralo y confirma que aparecen las rutas ya calculadas.
5. Desconecta únicamente el acceso a AdMob o usa un bloqueador: el cálculo debe
   continuar sin publicidad, siempre que el backend siga accesible.

Para reiniciar los contadores durante pruebas, borra los datos de la aplicación
desde Ajustes de Android o desinstala y vuelve a instalar el APK. No pulses
anuncios reales durante desarrollo; esta versión no contiene IDs reales.

## Comprobaciones locales

Desde la raíz:

```powershell
pnpm --filter @collectigo/mobile test
pnpm --filter @collectigo/mobile lint
pnpm --filter @collectigo/mobile exec tsc --noEmit
pnpm dlx expo-doctor@latest
```

## Antes de activar anuncios reales

No basta con cambiar un ID. Primero deben completarse la cuenta y aplicación en
AdMob, privacidad y mensajes, política de privacidad pública, Data Safety y la
declaración de anuncios de Play Console, `app-ads.txt`, límites de frecuencia y
la decisión legal sobre personalización. La ruta de producción queda fuera de
esta implementación deliberadamente.
