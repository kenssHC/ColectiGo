import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { authService, getAuthErrorMessage } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { setUser } = useAuthStore();

  async function handleLogin(): Promise<void> {
    if (!email.trim() || !password) {
      setErrorMessage('Completa todos los campos para continuar');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const user = await authService.signIn(email, password);
      setUser(user);
      router.replace('/(tabs)/map');
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'No se pudo iniciar sesión. Intenta nuevamente'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(): Promise<void> {
    if (!email.trim()) {
      setErrorMessage('Escribe tu correo para enviarte el enlace de recuperación');
      return;
    }
    try {
      await authService.sendPasswordReset(email);
      Alert.alert(
        'Correo enviado',
        `Si existe una cuenta para ${email.trim()}, recibirás un enlace para restablecer tu contraseña.`,
      );
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'No se pudo enviar el correo de recuperación'));
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
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
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View className="gap-1.5">
                <Text className="text-sm font-medium text-gray-700">Contraseña</Text>
                <View className="relative">
                  <Input
                    placeholder="••••••••"
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setErrorMessage('');
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    className="absolute right-3 top-3.5"
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="self-end"
                onPress={handleForgotPassword}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-blue-700 text-sm font-medium">
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
            </View>

            <View className="gap-3">
              <Button label="Ingresar" onPress={handleLogin} isLoading={isLoading} size="lg" />

              <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-gray-100" />
                <Text className="text-gray-400 text-xs">o</Text>
                <View className="flex-1 h-px bg-gray-100" />
              </View>

              <TouchableOpacity
                className="py-3 items-center"
                onPress={() => router.push('/(auth)/register')}
                accessibilityRole="button"
              >
                <Text className="text-gray-500 text-sm">
                  ¿No tienes cuenta?{' '}
                  <Text className="text-blue-700 font-semibold">Regístrate</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
