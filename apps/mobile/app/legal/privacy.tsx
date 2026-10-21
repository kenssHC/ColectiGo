import type { ReactElement } from 'react';
import {
  LegalDocumentScreen,
  type LegalSection,
} from '../../src/components/legal/LegalDocumentScreen';
import { legalConfig } from '../../src/config/legal.config';

export default function PrivacyPolicyScreen(): ReactElement {
  const privacyContact = legalConfig.privacyEmail;
  const contactLabel =
    privacyContact || 'el correo de privacidad que se publicará antes del lanzamiento';

  const sections: LegalSection[] = [
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
        `El responsable del tratamiento de datos de ColectiGO es ${legalConfig.responsibleName}, persona natural en Perú. Esta política se aplica a la aplicación móvil, su backend y los canales de soporte asociados.`,
        `ColectiGO está dirigido a personas de ${legalConfig.audienceLabel}. La aplicación no incorpora por ahora un bloqueo técnico de edad.`,
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
      title: '8. Seguridad y transferencias',
      paragraphs: [
        'Se aplican controles de acceso, cifrado en tránsito en producción, medidas de seguridad y procedimientos de eliminación de cuenta. Ningún sistema ofrece seguridad absoluta.',
        'Algunos proveedores tecnológicos pueden procesar información fuera de Perú. Antes del lanzamiento se documentarán los proveedores y regiones definitivos y se configurarán las garantías contractuales y técnicas aplicables.',
      ],
    },
    {
      title: '9. Tus decisiones y derechos',
      paragraphs: [
        `Puedes solicitar acceso, rectificación, cancelación, oposición u otra consulta escribiendo a ${contactLabel}. Será necesario verificar razonablemente tu identidad antes de entregar o modificar datos.`,
        'Puedes negar el permiso de ubicación y elegir manualmente el origen. También puedes cerrar sesión o eliminar tu cuenta desde Perfil. La eliminación borra los datos de cuenta en ColectiGO y solicita la eliminación al proveedor de autenticación, salvo información que deba conservarse por una obligación aplicable.',
      ],
    },
    {
      title: '10. Cambios y contacto',
      paragraphs: [
        `Las modificaciones materiales se comunicarán dentro de la app y se actualizará la fecha de esta política. Para privacidad, escribe a ${contactLabel}.`,
      ],
    },
  ];

  return (
    <LegalDocumentScreen
      title="Política de privacidad"
      subtitle="Cómo tratamos tus datos"
      updatedAt={legalConfig.effectiveDateLabel}
      sections={sections}
      contactEmail={privacyContact || undefined}
      publicUrl={legalConfig.privacyPolicyUrl || undefined}
    />
  );
}
