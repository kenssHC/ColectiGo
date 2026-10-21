import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { useAuthStore } from '../src/stores/auth.store';

/** Ruta de entrada de la app: dirige según el estado de la sesión. */
export default function IndexScreen(): ReactElement | null {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  return <Redirect href="/(tabs)/map" />;
}
