import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapPlaceholder } from '../../src/components/map/MapPlaceholder';
import { Button } from '../../src/components/ui/Button';
import { usePlannerStore } from '../../src/stores/planner.store';
import { useLocation } from '../../src/hooks/useLocation';
import { useRouteSearch } from '../../src/hooks/useRouteSearch';
import { HUANCAYO_CENTER } from '../../src/data/mock.data';
import type { LatLng } from '@collectigo/shared';

type SelectionStep = 'idle' | 'origin' | 'destination';

export default function MapScreen() {
  const { location } = useLocation();
  const { origin, destination, setOrigin, setDestination, reset, isCalculating } =
    usePlannerStore();
  const { canSearch, search } = useRouteSearch();
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('idle');

  function handleSelectOrigin(): void {
    setOrigin(location ?? HUANCAYO_CENTER);
    setSelectionStep('destination');
  }

  function handleSelectDestination(): void {
    const mockDest: LatLng = {
      lat: (location?.lat ?? HUANCAYO_CENTER.lat) - 0.015,
      lng: (location?.lng ?? HUANCAYO_CENTER.lng) - 0.012,
    };
    setDestination(mockDest);
    setSelectionStep('idle');
  }

  function handleReset(): void {
    reset();
    setSelectionStep('idle');
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 bg-blue-700 rounded-xl items-center justify-center">
            <Ionicons name="bus-outline" size={16} color="white" />
          </View>
          <Text className="text-lg font-bold text-gray-900">ColectiGO</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
          <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <Text className="text-xs font-medium text-green-700">Huancayo</Text>
        </View>
      </View>

      <View className="px-4 py-3 gap-2">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Planifica tu viaje
        </Text>

        <TouchableOpacity
          className={`flex-row items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border ${
            selectionStep === 'origin' ? 'border-blue-400 bg-blue-50' : 'border-gray-100'
          }`}
          onPress={handleSelectOrigin}
          disabled={!!origin}
        >
          <View className="w-8 h-8 rounded-full bg-blue-700 items-center justify-center">
            <Text className="text-white font-bold text-xs">A</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-400 mb-0.5">Origen</Text>
            <Text
              className={`text-sm font-medium ${origin ? 'text-gray-800' : 'text-gray-400'}`}
              numberOfLines={1}
            >
              {origin
                ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`
                : 'Toca para usar tu ubicación actual'}
            </Text>
          </View>
          {origin ? (
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          ) : (
            <Ionicons name="locate-outline" size={18} color="#9CA3AF" />
          )}
        </TouchableOpacity>

        {origin && (
          <TouchableOpacity
            className={`flex-row items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border ${
              selectionStep === 'destination' ? 'border-red-400 bg-red-50' : 'border-gray-100'
            }`}
            onPress={handleSelectDestination}
            disabled={!!destination}
          >
            <View className="w-8 h-8 rounded-full bg-red-600 items-center justify-center">
              <Text className="text-white font-bold text-xs">B</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">Destino</Text>
              <Text
                className={`text-sm font-medium ${destination ? 'text-gray-800' : 'text-gray-400'}`}
                numberOfLines={1}
              >
                {destination
                  ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                  : 'Toca para seleccionar destino'}
              </Text>
            </View>
            {destination ? (
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            ) : (
              <Ionicons name="location-outline" size={18} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        )}

        {(origin || destination) && (
          <TouchableOpacity
            className="flex-row items-center gap-1 self-end py-1"
            onPress={handleReset}
          >
            <Ionicons name="trash-outline" size={13} color="#9CA3AF" />
            <Text className="text-xs text-gray-400">Limpiar puntos</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-1">
        <MapPlaceholder origin={origin} destination={destination} />
      </View>

      {canSearch && (
        <View className="px-4 py-3 border-t border-gray-100 bg-white">
          <Button
            label="Calcular rutas disponibles"
            onPress={search}
            isLoading={isCalculating}
            size="lg"
            leftIcon={<Ionicons name="navigate-outline" size={18} color="white" />}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
