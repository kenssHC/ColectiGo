import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout(): ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          backgroundColor: colors.surface,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          height: 56 + Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Rutas',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-8 h-8 rounded-xl items-center justify-center ${
                focused ? 'bg-blue-100' : ''
              }`}
            >
              <Ionicons name={focused ? 'map' : 'map-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`w-8 h-8 rounded-xl items-center justify-center ${
                focused ? 'bg-blue-100' : ''
              }`}
            >
              <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
