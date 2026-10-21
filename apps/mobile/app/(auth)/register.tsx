import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAuthButton } from '../../src/components/auth/GoogleAuthButton';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { LegalLinks } from '../../src/components/legal/LegalLinks';
import { authService, getAuthErrorMessage } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { colors } from '../../src/theme/tokens';
import {
  authenticatedDestination,
  loginHref,
  parseAuthReturnPath,
} from '../../src/utils/auth-navigation';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnTo = parseAuthReturnPath(params.returnTo);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { setUser, setAuthOperationInProgress } = useAuthStore();
  const googleEnabled = authService.isGoogleSignInConfigured();

  function validate(): string | null {
    if (!displayName.trim()) return 'Ingresa tu nombre completo';
    if (!email.trim()) return 'Ingresa tu correo electrónico';
    if (!EMAIL_PATTERN.test(email.trim())) return 'El correo electrónico no es válido';
    if (!password) return 'Crea una contraseña';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  }

  async function handleRegister(): Promise<void> {
    const error = validate();
    if (error) {
      setErrorMessage(error);
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setAuthOperationInProgress(true);
    try {
      const user = await authService.register(email, password, displayName);
      setUser(user);
      router.replace(authenticatedDestination(returnTo));
    } catch (caughtError) {
      setErrorMessage(
        getAuthErrorMessage(caughtError, 'No se pudo crear la cuenta. Intenta nuevamente'),
      );
    } finally {
      setIsLoading(false);
      setAuthOperationInProgress(false);
    }
  }

  async function handleGoogleSignIn(): Promise<void> {
    if (isLoading || isGoogleLoading) return;
    setIsGoogleLoading(true);
    setErrorMessage('');
    setAuthOperationInProgress(true);
    try {
      const result = await authService.signInWithGoogle();
      if (result.status === 'cancelled') {
        setErrorMessage('Inicio con Google cancelado');
        return;
      }
      if (result.status === 'link_required') {
        Alert.alert(
          'Cuenta existente',
          'Ya existe una cuenta ColectiGO con este correo. Ingresa su contraseña para vincular Google.',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: (): void => authService.clearPendingGoogleLink(),
            },
            {
              text: 'Continuar',
              onPress: (): void => router.replace(loginHref(returnTo ?? undefined)),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      setUser(result.user);
      router.replace(authenticatedDestination(returnTo));
    } catch (error) {
      setErrorMessage(
        getAuthErrorMessage(error, 'No se pudo continuar con Google. Intenta nuevamente'),
      );
    } finally {
      setIsGoogleLoading(false);
      setAuthOperationInProgress(false);
    }
  }

  return (
    <View
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-2">
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View className="flex-1 px-6 pt-4 pb-6 gap-6">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-gray-900">Crear cuenta</Text>
              <Text className="text-gray-500 text-sm">Únete a ColectiGO y muévete mejor</Text>
            </View>

            <View className="gap-4">
              <Input
                label="Nombre completo"
                placeholder="Ej. Carlos Quispe"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setErrorMessage('');
                }}
                autoCapitalize="words"
              />
              <Input
                label="Correo electrónico"
                placeholder="tu@correo.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMessage('');
                }}
                secureTextEntry
              />
              <Input
                label="Confirmar contraseña"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMessage('');
                }}
                secureTextEntry
              />

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
            </View>

            <View className="gap-3">
              <LegalLinks context="register" />

              <Button
                label="Crear cuenta"
                loadingLabel="Creando cuenta…"
                onPress={handleRegister}
                isLoading={isLoading}
                disabled={isGoogleLoading}
                size="lg"
              />

              {googleEnabled ? (
                <>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-1 h-px bg-gray-100" />
                    <Text className="text-slate-500 text-xs">o</Text>
                    <View className="flex-1 h-px bg-gray-100" />
                  </View>
                  <GoogleAuthButton
                    onPress={() => void handleGoogleSignIn()}
                    isLoading={isGoogleLoading}
                    disabled={isLoading}
                  />
                </>
              ) : null}

              <TouchableOpacity
                className="py-3 items-center"
                onPress={() => router.replace(loginHref(returnTo ?? undefined))}
                accessibilityRole="button"
              >
                <Text className="text-gray-500 text-sm">
                  ¿Ya tienes cuenta? <Text className="text-blue-700 font-semibold">Ingresar</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
