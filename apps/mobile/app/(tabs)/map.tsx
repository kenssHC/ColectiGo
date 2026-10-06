import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import type { ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SelectionMap } from '../../src/components/map/SelectionMap';
import { Button } from '../../src/components/ui/Button';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { usePlannerStore } from '../../src/stores/planner.store';
import { useLocation } from '../../src/hooks/useLocation';
import { useRouteSearch } from '../../src/hooks/useRouteSearch';
import type { LatLng, PlannerMode } from '@collectigo/shared';

const PLANNER_MODES: Array<{ value: PlannerMode; label: string }> = [
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'fastest', label: 'Más rápida' },
  { value: 'cheapest', label: 'Más barata' },
  { value: 'less_walking', label: 'Caminar menos' },
  { value: 'fewer_transfers', label: 'Menos transbordos' },
];

export default function MapScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const { location, errorMessage: locationNotice } = useLocation();
  const { origin, destination, mode, setOrigin, setDestination, setMode, reset, isCalculating } =
    usePlannerStore();
  const { canSearch, search, errorMessage: searchError } = useRouteSearch();

  function handleUseCurrentLocation(): void {
    if (location) {
      setOrigin(location);
    }
  }

  function handleMapSelect(coordinate: LatLng): void {
    if (!origin) {
      setOrigin(coordinate);
    } else {
      setDestination(coordinate);
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          accessibilityRole="radiogroup"
        >
          {PLANNER_MODES.map((plannerMode) => {
            const selected = mode === plannerMode.value;
            return (
              <TouchableOpacity
                key={plannerMode.value}
                className={`rounded-full border px-3 py-2 ${
                  selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
                onPress={() => setMode(plannerMode.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text
                  className={`text-xs font-semibold ${selected ? 'text-blue-700' : 'text-gray-500'}`}
                >
                  {plannerMode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          className={`flex-row items-center gap-3 rounded-xl px-4 py-3 border ${
            origin ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-200'
          }`}
          onPress={handleUseCurrentLocation}
          accessibilityRole="button"
          accessibilityLabel="Usar mi ubicación actual como origen"
        >
          <View className="w-8 h-8 rounded-full bg-blue-700 items-center justify-center">
            <Text className="text-white font-bold text-xs">A</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-400 mb-0.5">Origen</Text>
            <Text
              className={`text-sm font-medium ${origin ? 'text-gray-800' : 'text-gray-500'}`}
              numberOfLines={1}
            >
              {origin
                ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`
                : 'Toca aquí para usar tu ubicación, o toca el mapa'}
            </Text>
          </View>
          {origin ? (
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          ) : (
            <Ionicons name="locate-outline" size={18} color="#1D4ED8" />
          )}
        </TouchableOpacity>

        {origin && (
          <View
            className={`flex-row items-center gap-3 rounded-xl px-4 py-3 border ${
              destination ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-200'
            }`}
          >
            <View className="w-8 h-8 rounded-full bg-red-600 items-center justify-center">
              <Text className="text-white font-bold text-xs">B</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-400 mb-0.5">Destino</Text>
              <Text
                className={`text-sm font-medium ${destination ? 'text-gray-800' : 'text-gray-500'}`}
                numberOfLines={1}
              >
                {destination
                  ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                  : 'Toca el mapa para elegir tu destino'}
              </Text>
            </View>
            {destination ? (
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            ) : (
              <Ionicons name="location-outline" size={18} color="#DC2626" />
            )}
          </View>
        )}

        {(origin || destination) && (
          <TouchableOpacity
            className="flex-row items-center gap-1 self-end py-1"
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Limpiar puntos seleccionados"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={13} color="#9CA3AF" />
            <Text className="text-xs text-gray-400">Limpiar puntos</Text>
          </TouchableOpacity>
        )}

        {locationNotice ? <ErrorBanner message={locationNotice} variant="info" /> : null}
        {searchError ? <ErrorBanner message={searchError} /> : null}
      </View>

      <View className="flex-1">
        <SelectionMap origin={origin} destination={destination} onSelect={handleMapSelect} />
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
    </View>
  );
}
