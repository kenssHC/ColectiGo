import { useState } from 'react';
import type { ReactElement } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { colors } from '../../src/theme/tokens';
import { loginHref, registerHref } from '../../src/utils/auth-navigation';
import { PRIVACY_POLICY_HREF, TERMS_OF_USE_HREF } from '../../src/utils/legal-navigation';

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
  const { user, setUser, setAuthOperationInProgress } = useAuthStore();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';
  const accessMethod = user?.authMethods.includes('google')
    ? user.authMethods.includes('password')
      ? 'Google + contraseña'
      : 'Google'
    : user?.authMethods.includes('password')
      ? 'Contraseña'
      : 'No disponible';

  async function handleLogout(): Promise<void> {
    setAuthOperationInProgress(true);
    try {
      await authService.signOut();
    } finally {
      setUser(null);
      setAuthOperationInProgress(false);
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

  async function handleDeleteAccount(): Promise<void> {
    setIsDeletingAccount(true);
    setAuthOperationInProgress(true);
    try {
      await authService.deleteAccount();
      setUser(null);
      router.replace('/(tabs)/map');
      Alert.alert('Cuenta eliminada', 'Tu cuenta de ColectiGO fue eliminada correctamente.');
    } catch (error) {
      Alert.alert(
        'No se pudo eliminar la cuenta',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente. Si el problema continúa, contacta a soporte.',
      );
    } finally {
      setIsDeletingAccount(false);
      setAuthOperationInProgress(false);
    }
  }

  function confirmDeleteAccount(): void {
    Alert.alert(
      'Eliminar cuenta',
      'Se eliminarán tu cuenta, perfil e identidades vinculadas. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: (): void => {
            Alert.alert(
              'Confirmación final',
              '¿Confirmas que deseas eliminar definitivamente tu cuenta?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar definitivamente',
                  style: 'destructive',
                  onPress: (): void => void handleDeleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScreenHeader title="Perfil" subtitle="Cuenta y contribuciones" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="bg-white mx-4 mt-4 rounded-2xl border border-gray-100 px-4 py-5">
          {user ? (
            <View className="flex-row items-center gap-4">
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  className="w-16 h-16 rounded-2xl bg-blue-50"
                  accessibilityLabel="Foto de perfil"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-blue-700 items-center justify-center">
                  <Text className="text-white text-2xl font-bold">{initials}</Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {user.email}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-1.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <Text className="text-xs text-green-600 font-medium">Cuenta activa</Text>
                </View>
                <Text className="text-xs text-slate-500 mt-1">
                  Método de acceso: {accessMethod}
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              <View className="flex-row items-center gap-4">
                <View className="w-16 h-16 rounded-2xl bg-blue-100 items-center justify-center">
                  <Ionicons name="person-outline" size={28} color={colors.primary} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-lg font-bold text-gray-900">
                    Estás usando ColectiGO como invitado
                  </Text>
                  <Text className="text-sm text-gray-500 leading-5">
                    Puedes consultar rutas sin una cuenta. Inicia sesión para enviar sugerencias y
                    usar funciones personales.
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 min-h-11 bg-blue-700 rounded-xl items-center justify-center active:opacity-70"
                  onPress={() => router.push(loginHref())}
                  accessibilityRole="button"
                >
                  <Text className="text-white text-sm font-semibold">Iniciar sesión</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 min-h-11 border border-blue-700 rounded-xl items-center justify-center active:bg-blue-50"
                  onPress={() => router.push(registerHref())}
                  accessibilityRole="button"
                >
                  <Text className="text-blue-700 text-sm font-semibold">Crear cuenta</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl border border-gray-100 px-4">
          <Text className="text-xs font-semibold text-slate-600 uppercase tracking-wider pt-4 pb-2">
            Mi actividad
          </Text>
          <ProfileOption
            icon="paper-plane-outline"
            label="Enviar sugerencia de ruta"
            onPress={() =>
              user
                ? router.push('/profile/new-suggestion')
                : router.push(loginHref('/profile/new-suggestion'))
            }
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

        <View className="bg-white mx-4 mt-3 rounded-2xl border border-gray-100 px-4">
          <Text className="text-xs font-semibold text-slate-600 uppercase tracking-wider pt-4 pb-2">
            Legal y privacidad
          </Text>
          <ProfileOption
            icon="shield-checkmark-outline"
            label="Política de privacidad"
            onPress={() => router.push(PRIVACY_POLICY_HREF)}
          />
          <ProfileOption
            icon="document-text-outline"
            label="Términos de uso"
            onPress={() => router.push(TERMS_OF_USE_HREF)}
            showDivider={false}
          />
        </View>

        {user ? (
          <View className="mx-4 mt-3 mb-6 gap-2">
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 bg-white rounded-2xl py-4 border border-slate-200 active:opacity-70"
              onPress={confirmLogout}
              disabled={isDeletingAccount}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
              <Text className="text-slate-700 font-semibold text-sm">Cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-center gap-2 bg-red-50 rounded-2xl py-4 border border-red-100 active:opacity-70"
              onPress={confirmDeleteAccount}
              disabled={isDeletingAccount}
              accessibilityRole="button"
              accessibilityLabel="Eliminar cuenta"
              accessibilityState={{ disabled: isDeletingAccount, busy: isDeletingAccount }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text className="text-red-600 font-semibold text-sm">
                {isDeletingAccount ? 'Eliminando cuenta…' : 'Eliminar cuenta'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="h-6" />
        )}
      </ScrollView>
    </View>
  );
}
