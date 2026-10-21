# Fase 2: transparencia legal y privacidad

> Documento técnico y operativo. Los textos incluidos en la app deben recibir
> revisión jurídica profesional antes del lanzamiento comercial.

## Alcance implementado

- Política de privacidad accesible sin iniciar sesión.
- Términos de uso accesibles sin iniciar sesión.
- Accesos desde Login, Registro y Perfil.
- Aviso específico antes de enviar una sugerencia de ruta.
- Separación entre aceptación de Términos e información de privacidad.
- Responsable público configurable mediante variables no versionadas.
- Correos y URLs públicas configurables sin escribir un correo personal en Git.
- Bloqueo de builds de producción si faltan los datos públicos obligatorios.
- Audiencia declarada `18+`, sin una barrera técnica de edad.

## Correo temporal

Mientras ColectiGO no tenga dominio propio, se puede utilizar una cuenta gratuita
de un proveedor como Gmail u Outlook. Debe ser una cuenta nueva dedicada al
proyecto, no el buzón personal principal del responsable.

Recomendaciones mínimas:

1. Crear una cuenta cuyo nombre identifique a ColectiGO.
2. Usar una contraseña única y activar autenticación multifactor o passkey.
3. Configurar recuperación con un canal privado que no se publique.
4. No almacenar contraseñas, tokens ni documentos de identidad recibidos por
   correo.
5. Revisar el buzón regularmente y responder solicitudes sobre datos personales.
6. Migrar posteriormente a `privacidad@dominio` y `soporte@dominio`.

El mismo correo dedicado puede cumplir temporalmente ambas funciones. El correo
será público dentro de la app, la política web y Google Play, aunque se configure
por una variable que no esté versionada.

## Configuración local

Añadir a `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME="NOMBRE LEGAL DEL RESPONSABLE"
EXPO_PUBLIC_PRIVACY_EMAIL="correo-dedicado@example.com"
EXPO_PUBLIC_SUPPORT_EMAIL="correo-dedicado@example.com"
```

Las URLs pueden quedar vacías durante desarrollo:

```dotenv
EXPO_PUBLIC_PRIVACY_POLICY_URL=
EXPO_PUBLIC_ACCOUNT_DELETION_URL=
```

Después de modificar el archivo, detener Metro y ejecutar nuevamente:

```powershell
pnpm mobile
```

No se requiere reconstruir el development build porque son cambios JavaScript.

## Publicación web requerida

Antes de generar una build de producción se necesitan páginas HTTPS públicas:

1. **Política de privacidad:** página HTML pública, legible sin autenticación,
   no geobloqueada y no editable por los visitantes. No debe ser solamente un PDF.
2. **Eliminación de cuenta:** página externa desde la que una persona pueda pedir
   la eliminación de su cuenta y datos aunque no tenga la app instalada.
3. **Términos de uso:** no sustituye los dos recursos exigidos por Google Play,
   pero mantiene accesibles públicamente las condiciones mostradas en la app.

Google Play también exige que la política esté enlazada dentro de la app y que las
aplicaciones con creación de cuenta tengan eliminación tanto dentro de la app como
mediante un recurso web externo:

- [Política de datos de usuario de Google Play](https://support.google.com/googleplay/android-developer/answer/18258653)
- [Requisitos de eliminación de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111)

Cuando existan las páginas, configurar:

```dotenv
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://dominio.example/privacidad
EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://dominio.example/eliminar-cuenta
```

El repositorio genera las tres páginas desde el mismo contenido de la app:

```powershell
pnpm.cmd legal:build
```

La salida queda en `hosting/`, está ignorada por Git porque contiene el nombre y
los correos públicos configurados, y se publica mediante Firebase Hosting. El
procedimiento completo y los comandos de vista previa están en
[`production-infrastructure.md`](production-infrastructure.md#12-páginas-legales-y-build-móvil).

## Producción en EAS

Los valores `EXPO_PUBLIC_*` se incluyen en la aplicación y deben considerarse
públicos. Se configuran como **Plain text**, no como secretos. Desde
`apps/mobile` se pueden registrar con:

```powershell
pnpm dlx eas-cli@latest env:set --name EXPO_PUBLIC_LEGAL_RESPONSIBLE_NAME --value "NOMBRE LEGAL DEL RESPONSABLE" --environment production --visibility plaintext
pnpm dlx eas-cli@latest env:set --name EXPO_PUBLIC_PRIVACY_EMAIL --value "correo-dedicado@example.com" --environment production --visibility plaintext
pnpm dlx eas-cli@latest env:set --name EXPO_PUBLIC_SUPPORT_EMAIL --value "correo-dedicado@example.com" --environment production --visibility plaintext
pnpm dlx eas-cli@latest env:set --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value "https://dominio.example/privacidad" --environment production --visibility plaintext
pnpm dlx eas-cli@latest env:set --name EXPO_PUBLIC_ACCOUNT_DELETION_URL --value "https://dominio.example/eliminar-cuenta" --environment production --visibility plaintext
```

También pueden añadirse desde **expo.dev → Project settings → Environment
variables**. La documentación oficial de Expo confirma que los valores incluidos
en código cliente son públicos aunque se almacenen en EAS:

- [Variables de entorno en EAS](https://docs.expo.dev/eas/environment-variables/)

`app.config.js` detendrá deliberadamente una build con
`EXPO_PUBLIC_APP_ENV=production` si falta alguno de estos datos o las URLs no usan
HTTPS.

## Retención aprobada

| Información                     |             Plazo máximo | Aplicación técnica                                     |
| ------------------------------- | -----------------------: | ------------------------------------------------------ |
| Cuenta e identidades vinculadas | Hasta eliminar la cuenta | Implementado en los sistemas de cuenta y autenticación |
| Correos de sugerencias          |                  90 días | Configurar regla en el proveedor/buzón elegido         |
| Logs operativos                 |                  30 días | Configurar en el proveedor de backend                  |
| Logs de seguridad               |                  90 días | Configurar en el proveedor de backend                  |

La infraestructura inicial elegida está documentada en
[`production-infrastructure.md`](production-infrastructure.md). Cloud Logging
debe conservar los logs operativos durante 30 días; si se separan logs de
seguridad, su bucket tendrá una retención de 90 días. Resend conserva contenido
y logs de correo durante 30 días, por debajo del máximo declarado. El buzón que
recibe sugerencias debe eliminar los mensajes al cumplir 90 días; mientras no
exista una regla automática, la persona responsable realizará una revisión y
eliminación manual mensual.

## Audiencia en Google Play

La decisión confirmada es declarar una audiencia de `18 años o más` sin activar
la función adicional **Impedir el acceso a menores de edad**. Según la ayuda
actual de Play Console, esa restricción puede habilitarse para apps diseñadas para
adultos y es obligatoria para determinadas categorías de contenido restringido;
ColectiGO no pertenece actualmente a esas categorías.

Al completar Play Console:

1. Ir a **Policy → App content → Target audience and content**.
2. Seleccionar solamente **Ages 18 and over**.
3. No marcar **Restrict Minor Access** con la decisión actual.
4. Mantener la descripción, capturas y publicidad coherentes con esa audiencia.
5. Volver a evaluar la decisión si cambian las funciones o el contenido.

Referencia: [Audiencia objetivo en Google Play](https://support.google.com/googleplay/android-developer/answer/9867159).

## Marco peruano

El responsable debe revisar la Ley N.° 29733 y su Reglamento aprobado mediante el
Decreto Supremo N.° 016-2024-JUS, vigente desde el 31 de marzo de 2025. La app
ofrece accesos para informar el tratamiento y ejercer solicitudes, pero una
revisión profesional debe determinar obligaciones como registro de bancos de
datos, transferencias y atención formal de derechos.

- [Reglamento vigente publicado por la ANPD](https://www.gob.pe/institucion/anpd/normas-legales/6554453-16-2024-jus)
- [Información de derechos ARCO](https://www.gob.pe/institucion/anpd/tema/derechos-arco)

## Prueba manual

1. Abrir Login y comprobar ambos enlaces legales.
2. Abrir Registro y revisar el aviso `18+`, Términos y Privacidad.
3. Entrar como invitado a Perfil y abrir ambos documentos.
4. Iniciar sesión y abrir una nueva sugerencia.
5. Confirmar que el aviso enumera los datos enviados por correo.
6. Tras configurar los correos, pulsar el botón de contacto y comprobar que se
   abre el cliente de correo.
7. Confirmar que volver desde cada documento conserva el formulario anterior.

## Pendiente antes de producción

- Crear los buzones públicos.
- Crear y configurar Google Cloud, Resend, Firebase Hosting y Cloudflare DNS.
- Aplicar las reglas de retención aceptadas.
- Publicar las páginas web HTTPS de privacidad, términos y eliminación.
- Confirmar que la política describa correctamente las categorías de
  destinatarios y las transferencias internacionales del despliegue final.
- Obtener revisión jurídica del contenido.
- Completar Data Safety de Google Play con el comportamiento del AAB final.
