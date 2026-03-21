import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LatLng } from '@collectigo/shared';

interface MapPlaceholderProps {
  origin: LatLng | null;
  destination: LatLng | null;
  onPress?: (coordinate: LatLng) => void;
}

export function MapPlaceholder({ origin, destination }: MapPlaceholderProps) {
  return (
    <View className="flex-1 bg-slate-100 relative overflow-hidden">
      <View className="absolute inset-0">
        <View className="absolute top-[15%] left-0 right-0 h-px bg-slate-300 opacity-60" />
        <View className="absolute top-[30%] left-0 right-0 h-px bg-slate-300 opacity-60" />
        <View className="absolute top-[45%] left-0 right-0 h-px bg-slate-300 opacity-60" />
        <View className="absolute top-[60%] left-0 right-0 h-px bg-slate-300 opacity-60" />
        <View className="absolute top-[75%] left-0 right-0 h-px bg-slate-300 opacity-60" />
        <View className="absolute top-[90%] left-0 right-0 h-px bg-slate-300 opacity-60" />

        <View className="absolute top-0 bottom-0 left-[15%] w-px bg-slate-300 opacity-60" />
        <View className="absolute top-0 bottom-0 left-[30%] w-px bg-slate-300 opacity-60" />
        <View className="absolute top-0 bottom-0 left-[45%] w-px bg-slate-300 opacity-60" />
        <View className="absolute top-0 bottom-0 left-[60%] w-px bg-slate-300 opacity-60" />
        <View className="absolute top-0 bottom-0 left-[75%] w-px bg-slate-300 opacity-60" />
        <View className="absolute top-0 bottom-0 left-[90%] w-px bg-slate-300 opacity-60" />

        <View className="absolute top-[22%] left-[10%] right-[30%] h-2.5 rounded-full bg-gray-300 opacity-70" />
        <View className="absolute top-[40%] left-[20%] right-[10%] h-2.5 rounded-full bg-gray-300 opacity-70" />
        <View className="absolute top-[55%] left-[5%] right-[40%] h-2.5 rounded-full bg-gray-300 opacity-70" />
        <View className="absolute top-[70%] left-[15%] right-[20%] h-2.5 rounded-full bg-gray-300 opacity-70" />

        <View className="absolute top-[10%] bottom-[20%] left-[35%] w-2.5 rounded-full bg-gray-300 opacity-70" />
        <View className="absolute top-[25%] bottom-[10%] left-[65%] w-2.5 rounded-full bg-gray-300 opacity-70" />
      </View>

      <View className="absolute inset-0 items-center justify-center gap-2">
        {!origin && !destination ? (
          <>
            <View className="bg-white/80 rounded-2xl px-5 py-3 items-center gap-1">
              <Ionicons name="map-outline" size={28} color="#6B7280" />
              <Text className="text-sm font-medium text-gray-500">Mapa de Huancayo</Text>
              <Text className="text-xs text-gray-400 text-center">
                Toca los puntos del panel{'\n'}para seleccionar origen y destino
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {origin ? (
        <View className="absolute top-[38%] left-[30%]">
          <View className="items-center">
            <View className="bg-blue-700 rounded-full w-8 h-8 items-center justify-center shadow-lg">
              <Text className="text-white font-bold text-xs">A</Text>
            </View>
            <View className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-blue-700" />
          </View>
        </View>
      ) : null}

      {destination ? (
        <View className="absolute top-[55%] left-[60%]">
          <View className="items-center">
            <View className="bg-red-600 rounded-full w-8 h-8 items-center justify-center shadow-lg">
              <Text className="text-white font-bold text-xs">B</Text>
            </View>
            <View className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-red-600" />
          </View>
        </View>
      ) : null}

      {origin && destination ? (
        <View className="absolute top-[38%] left-[30%] right-[28%] top-[45%]">
          <View
            className="h-0.5 bg-blue-400 opacity-60"
            style={{ transform: [{ rotate: '25deg' }] }}
          />
        </View>
      ) : null}
    </View>
  );
}
