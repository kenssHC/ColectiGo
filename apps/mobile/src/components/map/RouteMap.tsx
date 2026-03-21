import type { LatLng } from '@collectigo/shared';
import { View, Text } from 'react-native';

interface RouteMapProps {
  userLocation: LatLng | null;
  onMapPress?: (coordinate: LatLng) => void;
}

export function RouteMap({ userLocation: _userLocation, onMapPress: _onMapPress }: RouteMapProps) {
  return (
    <View className="flex-1 items-center justify-center bg-gray-100">
      <Text className="text-gray-400 text-sm">Mapa (requiere API key)</Text>
    </View>
  );
}
