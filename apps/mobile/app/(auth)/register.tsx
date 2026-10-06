import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { authService, getAuthErrorMessage } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { setUser } = useAuthStore();

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
    try {
      const user = await authService.register(email, password, displayName);
      setUser(user);
      router.replace('/(tabs)/map');
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err, 'No se pudo crear la cuenta. Intenta nuevamente'));
    } finally {
      setIsLoading(false);
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
          <View className="px-6 pt-6 pb-2 flex-row items-center gap-2">
            <TouchableOpacity
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={18} color="#374151" />
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
                onChangeText={(t) => {
                  setDisplayName(t);
                  setErrorMessage('');
                }}
                autoCapitalize="words"
              />
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
              <Input
                label="Contraseña"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage('');
                }}
                secureTextEntry
              />
              <Input
                label="Confirmar contraseña"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrorMessage('');
                }}
                secureTextEntry
              />

              {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
            </View>

            <View className="gap-3">
              <Button
                label="Crear cuenta"
                onPress={handleRegister}
                isLoading={isLoading}
                size="lg"
              />

              <TouchableOpacity
                className="py-3 items-center"
                onPress={() => router.back()}
                accessibilityRole="button"
              >
                <Text className="text-gray-500 text-sm">
                  ¿Ya tienes cuenta?{' '}
                  <Text className="text-blue-700 font-semibold">Ingresar</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
