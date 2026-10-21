import '../global.css';
import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { useAuthListener } from '../src/hooks/useAuthListener';
import { useAuthStore } from '../src/stores/auth.store';

function LoadingScreen(): ReactElement {
  return (
    <>
      <StatusBar style="light" />
      <View className="flex-1 items-center justify-center bg-blue-700 gap-3">
        <Text className="text-4xl font-bold text-white tracking-tight">ColectiGO</Text>
        <Text className="text-blue-100 text-sm">Huancayo a tu ritmo</Text>
        <ActivityIndicator size="large" color="white" style={{ marginTop: 24 }} />
      </View>
    </>
  );
}

export default function RootLayout(): ReactElement {
  useAuthListener();
  const segments = useSegments();
  const { user, isLoading, isAuthOperationInProgress } = useAuthStore();

  useEffect(() => {
    if (isLoading || isAuthOperationInProgress) return;

    const topLevelSegment = segments[0] as string | undefined;
    if (!topLevelSegment || topLevelSegment === 'index') return;

    const isInAuthGroup = topLevelSegment === '(auth)';
    if (user && isInAuthGroup) {
      router.replace('/(tabs)/map');
    }
  }, [user, isLoading, isAuthOperationInProgress, segments]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
