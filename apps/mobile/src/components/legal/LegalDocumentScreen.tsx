import type { ReactElement } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { LegalSection } from '@collectigo/shared';
import { ScreenHeader } from '../ui/ScreenHeader';
import { colors } from '../../theme/tokens';

export type { LegalSection } from '@collectigo/shared';

interface LegalDocumentScreenProps {
  title: string;
  subtitle: string;
  updatedAt: string;
  sections: LegalSection[];
  contactEmail?: string;
  publicUrl?: string;
}

async function openLink(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No se pudo abrir el enlace', 'Intenta nuevamente desde otro dispositivo.');
  }
}

export function LegalDocumentScreen({
  title,
  subtitle,
  updatedAt,
  sections,
  contactEmail,
  publicUrl,
}: LegalDocumentScreenProps): ReactElement {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <ScreenHeader title={title} subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 24),
          gap: 12,
        }}
      >
        <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Última actualización
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-800">{updatedAt}</Text>
        </View>

        {sections.map((section) => (
          <View
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 gap-2"
          >
            <Text className="text-base font-bold text-slate-900">{section.title}</Text>
            {section.paragraphs?.map((paragraph) => (
              <Text key={paragraph} className="text-sm leading-6 text-slate-700">
                {paragraph}
              </Text>
            ))}
            {section.bullets?.map((bullet) => (
              <View key={bullet} className="flex-row items-start gap-2">
                <Text className="text-sm leading-6 text-blue-700">•</Text>
                <Text className="flex-1 text-sm leading-6 text-slate-700">{bullet}</Text>
              </View>
            ))}
          </View>
        ))}

        {contactEmail ? (
          <Pressable
            className="min-h-12 rounded-xl bg-blue-700 px-4 flex-row items-center justify-center gap-2 active:bg-blue-800"
            onPress={() => void openLink(`mailto:${contactEmail}`)}
            accessibilityRole="link"
            accessibilityLabel={`Escribir a ${contactEmail}`}
          >
            <Ionicons name="mail-outline" size={20} color={colors.white} />
            <Text className="text-sm font-semibold text-white">{contactEmail}</Text>
          </Pressable>
        ) : (
          <View className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Text className="text-sm leading-5 text-amber-900">
              El correo público de contacto debe configurarse antes de generar una versión de
              producción.
            </Text>
          </View>
        )}

        {publicUrl ? (
          <Pressable
            className="min-h-12 rounded-xl border border-blue-700 bg-white px-4 flex-row items-center justify-center gap-2 active:bg-blue-50"
            onPress={() => void openLink(publicUrl)}
            accessibilityRole="link"
            accessibilityLabel="Abrir versión web"
          >
            <Ionicons name="open-outline" size={20} color={colors.primary} />
            <Text className="text-sm font-semibold text-blue-700">Ver versión web</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
