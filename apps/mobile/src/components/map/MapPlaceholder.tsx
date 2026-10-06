import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import type { LatLng } from '@collectigo/shared';
import { HUANCAYO_CENTER } from '../../constants/locations';
import { colors } from '../../theme/tokens';

interface MapPlaceholderProps {
  origin: LatLng | null;
  destination: LatLng | null;
  onSelect?: (coordinate: LatLng) => void;
}

/**
 * Sustituto visual del mapa para plataformas sin react-native-maps (web).
 * Permite seleccionar origen/destino con toques en zonas aproximadas.
 */
export function MapPlaceholder({
  origin,
  destination,
  onSelect,
}: MapPlaceholderProps): ReactElement {
  function handlePress(offsetLat: number, offsetLng: number): void {
    onSelect?.({
      lat: HUANCAYO_CENTER.lat + offsetLat,
      lng: HUANCAYO_CENTER.lng + offsetLng,
    });
  }

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
      </View>

      <Pressable
        className="absolute inset-0"
        onPress={() => handlePress(0.008, -0.006)}
        accessibilityRole="button"
        accessibilityLabel="Seleccionar punto en el mapa"
      />

      <View className="absolute inset-0 items-center justify-center pointer-events-none">
        <View className="bg-white/90 rounded-2xl px-5 py-3 items-center gap-1">
          <Ionicons name="map-outline" size={28} color={colors.textSecondary} />
          <Text className="text-sm font-medium text-slate-700">Mapa de Huancayo</Text>
          <Text className="text-xs text-slate-600 text-center">
            {onSelect
              ? 'Toca el mapa para elegir origen o destino'
              : 'El mapa interactivo está disponible\nen Android o iOS'}
          </Text>
        </View>
      </View>

      {origin ? (
        <View className="absolute top-[38%] left-[30%] pointer-events-none">
          <View className="items-center">
            <View className="bg-blue-700 rounded-full w-8 h-8 items-center justify-center shadow-lg">
              <Text className="text-white font-bold text-xs">A</Text>
            </View>
          </View>
        </View>
      ) : null}

      {destination ? (
        <View className="absolute top-[55%] left-[60%] pointer-events-none">
          <View className="items-center">
            <View className="bg-red-600 rounded-full w-8 h-8 items-center justify-center shadow-lg">
              <Text className="text-white font-bold text-xs">B</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
