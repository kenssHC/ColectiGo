import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1D4ED8',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          backgroundColor: '#FFFFFF',
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
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
              <Ionicons
                name={focused ? 'map' : 'map-outline'}
                size={20}
                color={color}
              />
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
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
