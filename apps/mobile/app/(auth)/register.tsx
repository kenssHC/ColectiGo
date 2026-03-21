import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { localAuthService } from '../../src/services/local-auth.service';
import { useAuthStore } from '../../src/stores/auth.store';

export default function RegisterScreen() {
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
    if (!email.includes('@')) return 'El correo electrónico no es válido';
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
      const user = await localAuthService.register(email, password, displayName);
      setUser(user);
      router.replace('/(tabs)/map');
    } catch {
      setErrorMessage('No se pudo crear la cuenta. Intenta nuevamente');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
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

              {errorMessage ? (
                <View className="flex-row items-center gap-2 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text className="text-red-600 text-sm flex-1">{errorMessage}</Text>
                </View>
              ) : null}
            </View>

            <View className="gap-3">
              <Button
                label="Crear cuenta"
                onPress={handleRegister}
                isLoading={isLoading}
                size="lg"
              />

              <TouchableOpacity className="py-3 items-center" onPress={() => router.back()}>
                <Text className="text-gray-500 text-sm">
                  ¿Ya tienes cuenta?{' '}
                  <Text className="text-blue-700 font-semibold">Ingresar</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
