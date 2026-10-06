import type { ReactElement } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { colors } from '../../src/theme/tokens';

interface ProfileOptionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showDivider?: boolean;
  disabled?: boolean;
  trailingLabel?: string;
}

function showAbout(): void {
  Alert.alert(
    'Sobre ColectiGO',
    'ColectiGO te ayuda a planificar viajes en colectivos, autos y buses de Huancayo.\n\nVersión 1.0.0\nTransporte local, a tu ritmo.',
  );
}

function ProfileOption({
  icon,
  label,
  onPress,
  showDivider = true,
  disabled = false,
  trailingLabel,
}: ProfileOptionProps): ReactElement {
  return (
    <>
      <TouchableOpacity
        className="flex-row items-center gap-3 py-3.5 active:opacity-60"
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <View className="w-9 h-9 bg-blue-50 rounded-xl items-center justify-center">
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text
          className={`text-sm font-medium flex-1 ${disabled ? 'text-slate-500' : 'text-slate-700'}`}
        >
          {label}
        </Text>
        {trailingLabel ? (
          <View className="rounded-full bg-slate-100 px-2 py-1">
            <Text className="text-xs font-semibold text-slate-600">{trailingLabel}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>
      {showDivider && <View className="h-px bg-gray-50 ml-12" />}
    </>
  );
}

export default function ProfileScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  async function handleLogout(): Promise<void> {
    try {
      await authService.signOut();
    } finally {
      setUser(null);
      router.replace('/(auth)/login');
    }
  }

  function confirmLogout(): void {
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: (): void => {
          void handleLogout();
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Perfil" subtitle="Cuenta y contribuciones" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="bg-white mx-4 mt-4 rounded-2xl border border-gray-100 px-4 py-5">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-blue-700 items-center justify-center">
              <Text className="text-white text-2xl font-bold">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                {user?.displayName ?? 'Usuario'}
              </Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <Text className="text-xs text-green-600 font-medium">Cuenta activa</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl border border-gray-100 px-4">
          <Text className="text-xs font-semibold text-slate-600 uppercase tracking-wider pt-4 pb-2">
            Mi actividad
          </Text>
          <ProfileOption
            icon="git-branch-outline"
            label="Mis sugerencias de rutas"
            onPress={() => router.push('/profile/suggestions')}
          />
          <ProfileOption
            icon="bookmark-outline"
            label="Rutas guardadas"
            onPress={() => undefined}
            disabled
            trailingLabel="Próximamente"
            showDivider={false}
          />
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl border border-gray-100 px-4">
          <Text className="text-xs font-semibold text-slate-600 uppercase tracking-wider pt-4 pb-2">
            Configuración
          </Text>
          <ProfileOption
            icon="notifications-outline"
            label="Notificaciones"
            onPress={() => undefined}
            disabled
            trailingLabel="Próximamente"
          />
          <ProfileOption
            icon="information-circle-outline"
            label="Sobre ColectiGO"
            onPress={showAbout}
            showDivider={false}
          />
        </View>

        <View className="mx-4 mt-3 mb-6">
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 bg-red-50 rounded-2xl py-4 border border-red-100 active:opacity-70"
            onPress={confirmLogout}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text className="text-red-600 font-semibold text-sm">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
