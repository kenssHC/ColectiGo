import './global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthListener } from '../src/hooks/useAuthListener';
import { useAuthStore } from '../src/stores/auth.store';

function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-700 gap-3">
      <Text className="text-4xl font-bold text-white tracking-tight">ColectiGO</Text>
      <Text className="text-blue-200 text-sm">Huancayo a tu ritmo</Text>
      <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" style={{ marginTop: 24 }} />
    </View>
  );
}

export default function RootLayout() {
  useAuthListener();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace('/(tabs)/map');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
