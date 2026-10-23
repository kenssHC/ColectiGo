import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
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
  parseAuthReturnPath,
  registerHref,
} from '../../src/utils/auth-navigation';

export default function LoginScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnTo = parseAuthReturnPath(params.returnTo);
  const initialGoogleLink = authService.getPendingGoogleLink();
  const [email, setEmail] = useState(initialGoogleLink?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(Boolean(initialGoogleLink));

  const { setUser, setAuthOperationInProgress } = useAuthStore();
  const googleEnabled = authService.isGoogleSignInConfigured();

  async function handleLogin(): Promise<void> {
    if (!email.trim() || !password) {
      setErrorMessage('Completa todos los campos para continuar');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setAuthOperationInProgress(true);
    try {
      const user = isLinkingGoogle
        ? await authService.linkGoogleWithPassword(password)
        : await authService.signIn(email, password);
      setUser(user);
      router.replace(authenticatedDestination(returnTo));
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'No se pudo iniciar sesión. Intenta nuevamente'));
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
        setEmail(result.email);
        setPassword('');
        setIsLinkingGoogle(true);
        Alert.alert(
          'Cuenta existente',
          'Ingresa la contraseña de tu cuenta ColectiGO para vincular Google sin perder tu historial.',
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

  async function handleForgotPassword(): Promise<void> {
    if (!email.trim()) {
      setErrorMessage('Escribe tu correo para enviarte el enlace de recuperación');
      return;
    }
    setIsResettingPassword(true);
    setErrorMessage('');
    try {
      await authService.sendPasswordReset(email);
      Alert.alert(
        'Correo enviado',
        `Si existe una cuenta para ${email.trim()}, recibirás un enlace para restablecer tu contraseña.`,
      );
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'No se pudo enviar el correo de recuperación'));
    } finally {
      setIsResettingPassword(false);
    }
  }

  function cancelGoogleLink(): void {
    authService.clearPendingGoogleLink();
    setIsLinkingGoogle(false);
    setPassword('');
    setErrorMessage('');
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
          <View className="bg-blue-700 px-6 pt-12 pb-10 gap-2">
            <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center mb-2">
              <Ionicons name="bus-outline" size={24} color="white" />
            </View>
            <Text className="text-white text-3xl font-bold tracking-tight">ColectiGO</Text>
            <Text className="text-blue-200 text-base">Tu guía de transporte en Huancayo</Text>
          </View>

          <View className="flex-1 px-6 pt-8 pb-6 gap-6">
            <View className="gap-1">
              <Text className="text-2xl font-bold text-gray-900">Bienvenido de vuelta</Text>
              <Text className="text-gray-500 text-sm">Ingresa a tu cuenta para continuar</Text>
            </View>

            <View className="gap-4">
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
                editable={!isLinkingGoogle}
              />

              <View className="gap-1.5">
                <Text className="text-sm font-medium text-gray-700">Contraseña</Text>
                <View className="relative">
                  <Input
                    accessibilityLabel="Contraseña"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    className="absolute right-3 top-3.5"
                    onPress={() => setShowPassword((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="self-end min-h-11 px-1 flex-row items-center justify-center gap-2"
                onPress={handleForgotPassword}
                disabled={isResettingPassword}
                accessibilityRole="button"
                accessibilityState={{ busy: isResettingPassword, disabled: isResettingPassword }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isResettingPassword ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
                <Text className="text-blue-700 text-sm font-semibold">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

              {isLinkingGoogle ? (
                <View className="rounded-xl border border-blue-100 bg-blue-50 p-3 gap-1">
                  <Text className="text-blue-900 text-sm font-semibold">
                    Vincular cuenta Google
                  </Text>
                  <Text className="text-blue-800 text-xs leading-5">
                    Confirma la contraseña de {email} para conservar la misma cuenta.
                  </Text>
                  <TouchableOpacity
                    className="self-start py-2"
                    onPress={cancelGoogleLink}
                    accessibilityRole="button"
                  >
                    <Text className="text-blue-700 text-xs font-semibold">
                      Cancelar vinculación
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <View className="gap-3">
              <Button
                label={isLinkingGoogle ? 'Vincular e ingresar' : 'Ingresar'}
                loadingLabel={isLinkingGoogle ? 'Vinculando…' : 'Ingresando…'}
                onPress={handleLogin}
                isLoading={isLoading}
                disabled={isGoogleLoading}
                size="lg"
              />

              {googleEnabled && !isLinkingGoogle ? (
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
                onPress={() => router.push(registerHref(returnTo ?? undefined))}
                accessibilityRole="button"
              >
                <Text className="text-gray-500 text-sm">
                  ¿No tienes cuenta? <Text className="text-blue-700 font-semibold">Regístrate</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="py-3 items-center"
                onPress={() => router.replace('/(tabs)/map')}
                accessibilityRole="button"
                accessibilityLabel="Continuar sin iniciar sesión"
              >
                <Text className="text-slate-600 text-sm font-semibold">
                  Continuar como invitado
                </Text>
              </TouchableOpacity>

              <LegalLinks context="login" compact />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
