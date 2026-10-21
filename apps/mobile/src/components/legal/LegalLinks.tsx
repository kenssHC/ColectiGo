import type { ReactElement } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { PRIVACY_POLICY_HREF, TERMS_OF_USE_HREF } from '../../utils/legal-navigation';

interface LegalLinksProps {
  context: 'login' | 'register' | 'suggestion';
}

const CONTEXT_COPY: Record<LegalLinksProps['context'], string> = {
  login: 'Consulta cómo funciona ColectiGO y cómo tratamos tus datos.',
  register:
    'Al crear una cuenta o continuar con Google, confirmas que tienes 18 años o más y aceptas los Términos de uso. La Política de privacidad explica el tratamiento de tus datos; no constituye un consentimiento para publicidad.',
  suggestion:
    'Al enviar, compartiremos con el equipo de ColectiGO tu nombre, correo, ruta seleccionada, tipo, texto y fecha. La sugerencia se entrega por correo, no se guarda en PostgreSQL y el correo se conservará hasta 90 días.',
};

export function LegalLinks({ context }: LegalLinksProps): ReactElement {
  return (
    <View className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 gap-2">
      <Text className="text-xs leading-5 text-slate-600">{CONTEXT_COPY[context]}</Text>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {context !== 'suggestion' ? (
          <TouchableOpacity
            className="min-h-8 justify-center"
            onPress={() => router.push(TERMS_OF_USE_HREF)}
            accessibilityRole="link"
            accessibilityLabel="Abrir Términos de uso"
          >
            <Text className="text-xs font-semibold text-blue-700">Términos de uso</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          className="min-h-8 justify-center"
          onPress={() => router.push(PRIVACY_POLICY_HREF)}
          accessibilityRole="link"
          accessibilityLabel="Abrir Política de privacidad"
        >
          <Text className="text-xs font-semibold text-blue-700">Política de privacidad</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
