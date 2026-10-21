import type { ReactElement } from 'react';
import {
  LegalDocumentScreen,
  type LegalSection,
} from '../../src/components/legal/LegalDocumentScreen';
import { legalConfig } from '../../src/config/legal.config';

export default function TermsOfUseScreen(): ReactElement {
  const supportContact = legalConfig.supportEmail || legalConfig.privacyEmail;
  const contactLabel =
    supportContact || 'el correo de soporte que se publicará antes del lanzamiento';

  const sections: LegalSection[] = [
    {
      title: '1. Aceptación',
      paragraphs: [
        'ColectiGO ofrece este servicio de información sobre transporte. Al crear una cuenta o utilizar sus funciones aceptas estos Términos de uso.',
        `El servicio está dirigido a personas de ${legalConfig.audienceLabel}. Declarar esta audiencia no implica que exista actualmente una verificación o bloqueo técnico de edad.`,
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
        `Puedes cerrar sesión o eliminar tu cuenta desde Perfil. Para soporte escribe a ${contactLabel}. El tratamiento de datos personales se explica separadamente en la Política de privacidad.`,
        'Estos términos se interpretan conforme al marco aplicable en Perú, sin limitar derechos irrenunciables que correspondan a los usuarios.',
      ],
    },
  ];

  return (
    <LegalDocumentScreen
      title="Términos de uso"
      subtitle="Condiciones del servicio"
      updatedAt={legalConfig.effectiveDateLabel}
      sections={sections}
      contactEmail={supportContact || undefined}
    />
  );
}
