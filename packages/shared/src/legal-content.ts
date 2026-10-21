export const LEGAL_POLICY_VERSION = '2026-10-21' as const;
export const LEGAL_EFFECTIVE_DATE_LABEL = '21 de octubre de 2026' as const;

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalContentConfig {
  responsibleName: string;
  privacyEmail: string;
  supportEmail: string;
  audienceLabel: string;
}

function contactLabel(email: string, purpose: string): string {
  return email || `el correo de ${purpose} que se publicará antes del lanzamiento`;
}

export function createPrivacyPolicySections(config: LegalContentConfig): LegalSection[] {
  const privacyContact = contactLabel(config.privacyEmail, 'privacidad');

  return [
    {
      title: '1. Servicios y destinatarios',
      paragraphs: [
        'ColectiGO no vende datos personales. Utiliza proveedores solamente para prestar las funciones descritas.',
      ],
      bullets: [
        'Google: autenticación opcional, gestión de sesión y recuperación de acceso, además de visualización cartográfica y, cuando corresponda, cálculo de rutas o tráfico.',
        'Proveedores de infraestructura y almacenamiento: operación segura del servicio y conservación de perfiles e identidades vinculadas.',
        'Proveedor de correo: entrega de sugerencias y comunicaciones solicitadas.',
        'Proveedores de ruteo: cálculo de recorridos a partir del origen y destino indicados.',
        'La versión de producción actual no activa publicidad. Si se habilita en el futuro, esta política se actualizará antes de utilizar datos con esa finalidad.',
      ],
    },
    {
      title: '2. Datos de cuenta y autenticación',
      bullets: [
        'Si creas una cuenta con correo: nombre, correo electrónico, identificador técnico de cuenta, estado de verificación, método de acceso y fechas técnicas de creación o actualización.',
        'La contraseña es tratada por el proveedor de autenticación. ColectiGO no puede verla ni conserva una copia.',
        'Si usas Google: se reciben tu correo verificado, nombre, enlace de foto de perfil y un identificador técnico necesario para reconocer y vincular la cuenta.',
        'ColectiGO conserva únicamente los datos necesarios para mantener esa vinculación y proteger el acceso.',
        'La foto de Google se muestra desde su enlace de perfil. No se descarga ni se conserva una copia del archivo y puede no actualizarse inmediatamente si cambia en Google.',
      ],
    },
    {
      title: '3. Ubicación y consultas de rutas',
      bullets: [
        'La app solicita ubicación aproximada o precisa en primer plano para centrar el mapa y facilitar la selección del origen.',
        'No se solicita ubicación en segundo plano ni se realiza seguimiento cuando la app está cerrada.',
        'Al calcular un viaje se envían al backend las coordenadas de origen y destino y el criterio de búsqueda elegido.',
        'ColectiGO no crea actualmente un historial de búsquedas ni conserva de forma permanente los puntos de origen o destino.',
        'Las coordenadas pueden enviarse al proveedor peatonal o de tráfico configurado para obtener recorridos y estimaciones.',
      ],
    },
    {
      title: '4. Sugerencias de rutas',
      paragraphs: [
        'Para enviar una sugerencia debes iniciar sesión. Se entrega al equipo de ColectiGO tu nombre, correo, ruta seleccionada, tipo de corrección, descripción y fecha de envío.',
        'La sugerencia se transmite mediante el proveedor de correo configurado y no se incorpora al historial de la cuenta ni a la base operativa de sugerencias. El mensaje administrativo se conserva hasta 90 días y luego debe eliminarse del buzón y sus copias operativas.',
      ],
    },
    {
      title: '5. Finalidades',
      bullets: [
        'Crear y proteger tu cuenta y permitir el acceso con correo o Google.',
        'Calcular y mostrar alternativas de viaje solicitadas por ti.',
        'Responder solicitudes de soporte, privacidad y sugerencias de rutas.',
        'Mantener la seguridad, prevenir abuso y diagnosticar fallos técnicos.',
        'Cumplir obligaciones aplicables y atender el ejercicio de derechos sobre datos personales.',
      ],
    },
    {
      title: '6. Responsable y alcance',
      paragraphs: [
        `El responsable del tratamiento de datos de ColectiGO es ${config.responsibleName}, persona natural en Perú. Esta política se aplica a la aplicación móvil, su backend y los canales de soporte asociados.`,
        `ColectiGO está dirigido a personas de ${config.audienceLabel}. La aplicación no incorpora por ahora un bloqueo técnico de edad.`,
      ],
    },
    {
      title: '7. Conservación',
      bullets: [
        'Cuenta, perfil e identidades vinculadas: mientras mantengas la cuenta o hasta que solicites su eliminación.',
        'Correos de sugerencias: hasta 90 días.',
        'Logs operativos: hasta 30 días.',
        'Logs de seguridad: hasta 90 días.',
        'Sesión local: hasta cerrar sesión, eliminar la cuenta o borrar los datos de la aplicación.',
      ],
    },
    {
      title: '8. Seguridad y transferencias internacionales',
      paragraphs: [
        'Se aplican controles de acceso, cifrado en tránsito en producción, medidas de seguridad y procedimientos de eliminación de cuenta. Ningún sistema ofrece seguridad absoluta.',
        'La infraestructura principal de la API y la base de datos se aloja en Chile. Los servicios de autenticación y correo pueden procesar datos en Estados Unidos, y los servicios de mapas o ruteo pueden operar mediante infraestructura global. Se mantienen las medidas contractuales, organizativas y técnicas aplicables a estos tratamientos fuera de Perú.',
      ],
    },
    {
      title: '9. Tus decisiones y derechos',
      paragraphs: [
        `Puedes solicitar acceso, rectificación, cancelación, oposición u otra consulta escribiendo a ${privacyContact}. Será necesario verificar razonablemente tu identidad antes de entregar o modificar datos.`,
        'Puedes negar el permiso de ubicación y elegir manualmente el origen. También puedes cerrar sesión o eliminar tu cuenta desde Perfil. La eliminación borra los datos de cuenta en ColectiGO y solicita la eliminación al proveedor de autenticación, salvo información que deba conservarse por una obligación aplicable.',
      ],
    },
    {
      title: '10. Cambios y contacto',
      paragraphs: [
        `Las modificaciones materiales se comunicarán dentro de la app y se actualizará la fecha de esta política. Para privacidad, escribe a ${privacyContact}.`,
      ],
    },
  ];
}

export function createTermsOfUseSections(config: LegalContentConfig): LegalSection[] {
  const supportContact = contactLabel(config.supportEmail || config.privacyEmail, 'soporte');

  return [
    {
      title: '1. Aceptación',
      paragraphs: [
        'ColectiGO ofrece este servicio de información sobre transporte. Al crear una cuenta o utilizar sus funciones aceptas estos Términos de uso.',
        `El servicio está dirigido a personas de ${config.audienceLabel}. Declarar esta audiencia no implica que exista actualmente una verificación o bloqueo técnico de edad.`,
      ],
    },
    {
      title: '2. Qué ofrece ColectiGO',
      paragraphs: [
        'ColectiGO ayuda a consultar rutas de transporte público y colectivo en Huancayo, comparar alternativas y visualizar tramos a pie, puntos de subida, bajada y transbordo.',
        'La aplicación es una herramienta informativa y no opera vehículos, no vende pasajes ni representa necesariamente a empresas de transporte.',
      ],
    },
    {
      title: '3. Rutas, tiempos, tráfico y tarifas',
      paragraphs: [
        'Los recorridos, tiempos, distancias, tráfico, caminatas, disponibilidad y tarifas son estimaciones. Pueden cambiar por decisiones del transportista, congestión, desvíos, clima, obras, horarios u otras condiciones reales.',
        'Verifica señalización, indicaciones de autoridades y condiciones del entorno antes de viajar. Una estimación de ColectiGO no sustituye información oficial ni garantiza que un vehículo pase, se detenga o cobre exactamente el importe mostrado.',
      ],
    },
    {
      title: '4. Uso seguro',
      bullets: [
        'No manipules la aplicación mientras conduces o cruzas una vía.',
        'Comprueba que el punto de subida o bajada sea físicamente accesible y seguro.',
        'Las rutas peatonales pueden omitir veredas, cruces, cierres u otras condiciones del terreno.',
        'No utilices ColectiGO para emergencias ni como sustituto de instrucciones de autoridades.',
      ],
    },
    {
      title: '5. Cuentas',
      paragraphs: [
        'Debes proporcionar información correcta, proteger tu método de acceso y avisar si detectas uso no autorizado. Puedes usar las consultas públicas como invitado; una cuenta es necesaria para funciones personales como enviar sugerencias.',
        'ColectiGO puede limitar o suspender una cuenta ante fraude, abuso, ataques, contenido ilícito o incumplimiento grave, respetando las obligaciones aplicables.',
      ],
    },
    {
      title: '6. Sugerencias y contenido enviado',
      paragraphs: [
        'Eres responsable de no incluir contraseñas, documentos de identidad, datos sensibles, información falsa o contenido de terceros que no estés autorizado a compartir.',
        'Al enviar una sugerencia autorizas a ColectiGO a revisarla y utilizarla para verificar o mejorar la información de rutas. Esta autorización no convierte a ColectiGO en propietario de tus fotografías u otros derechos que pudieran corresponderte.',
      ],
    },
    {
      title: '7. Servicios de terceros',
      paragraphs: [
        'El funcionamiento depende parcialmente de servicios externos de autenticación, mapas, cálculo de rutas, infraestructura y correo. Sus interrupciones o cambios pueden afectar temporalmente determinadas funciones.',
      ],
    },
    {
      title: '8. Imágenes, marcas e información referencial',
      paragraphs: [
        'Las fotografías de vehículos, carteles, colores, nombres y marcas se muestran con fines identificativos o referenciales. Su presencia no implica patrocinio, afiliación ni propiedad por parte de ColectiGO.',
        'Antes de publicar imágenes deben revisarse su licencia, autoría, placas, rostros y posibles derechos de terceros.',
      ],
    },
    {
      title: '9. Disponibilidad y cambios',
      paragraphs: [
        'Se podrá corregir, actualizar, suspender o retirar una función por mantenimiento, seguridad, cambios de proveedores o evolución del servicio. Cuando corresponda, los cambios materiales en estos términos serán comunicados y fechados.',
      ],
    },
    {
      title: '10. Eliminación y contacto',
      paragraphs: [
        `Puedes cerrar sesión o eliminar tu cuenta desde Perfil. Para soporte escribe a ${supportContact}. El tratamiento de datos personales se explica separadamente en la Política de privacidad.`,
        'Estos términos se interpretan conforme al marco aplicable en Perú, sin limitar derechos irrenunciables que correspondan a los usuarios.',
      ],
    },
  ];
}

export function createAccountDeletionSections(config: LegalContentConfig): LegalSection[] {
  const privacyContact = contactLabel(config.privacyEmail, 'privacidad');

  return [
    {
      title: 'Eliminar desde la aplicación',
      paragraphs: [
        'Abre ColectiGO, ingresa a Perfil y selecciona Eliminar cuenta. Confirma la acción para borrar tu cuenta, perfil e identidades de acceso vinculadas.',
        'La eliminación es definitiva. Puedes seguir consultando rutas como invitado después de cerrar o eliminar tu cuenta.',
      ],
    },
    {
      title: 'Solicitar eliminación sin acceso a la app',
      paragraphs: [
        `Escribe desde el correo asociado a tu cuenta a ${privacyContact} con el asunto "Eliminar cuenta ColectiGO". Se realizará una verificación razonable de identidad antes de procesar la solicitud.`,
      ],
    },
    {
      title: 'Datos eliminados o conservados temporalmente',
      bullets: [
        'Se eliminan la cuenta, el perfil y las identidades de autenticación vinculadas.',
        'Los correos de sugerencias pueden conservarse hasta 90 días.',
        'Los logs operativos pueden conservarse hasta 30 días y los de seguridad hasta 90 días.',
        'Puede conservarse información adicional solo cuando exista una obligación legal aplicable.',
      ],
    },
    {
      title: 'Responsable',
      paragraphs: [
        `${config.responsibleName} es responsable del tratamiento de datos de ColectiGO en Perú. Para consultas de privacidad, escribe a ${privacyContact}.`,
      ],
    },
  ];
}
