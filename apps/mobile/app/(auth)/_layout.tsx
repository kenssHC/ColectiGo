import type { ReactElement } from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout(): ReactElement {
  return <Stack screenOptions={{ headerShown: false }} />;
}
