import { useState } from 'react';
import type { ReactElement } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { LatLng, PlannerMode } from '@collectigo/shared';
import { SelectionMap } from '../../src/components/map/SelectionMap';
import { Button } from '../../src/components/ui/Button';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { usePlannerStore } from '../../src/stores/planner.store';
import { useLocation } from '../../src/hooks/useLocation';
import { useRouteSearch } from '../../src/hooks/useRouteSearch';
import { colors, shadows } from '../../src/theme/tokens';

type ActivePoint = 'origin' | 'destination';

const PLANNER_MODES: Array<{
  value: PlannerMode;
  label: string;
  description: string;
}> = [
  { value: 'balanced', label: 'Equilibrada', description: 'Balance recomendado' },
  { value: 'fastest', label: 'Más rápida', description: 'Prioriza tiempo' },
  { value: 'cheapest', label: 'Más barata', description: 'Prioriza tarifa' },
  { value: 'less_walking', label: 'Caminar menos', description: 'Reduce caminata' },
  {
    value: 'fewer_transfers',
    label: 'Menos transbordos',
    description: 'Prioriza simplicidad',
  },
];

interface PointFieldProps {
  kind: ActivePoint;
  coordinate: LatLng | null;
  isActive: boolean;
  onPress: () => void;
  onUseLocation?: () => void;
  isLocationLoading?: boolean;
  selectedLabel?: string;
}

function PointField({
  kind,
  coordinate,
  isActive,
  onPress,
  onUseLocation,
  isLocationLoading = false,
  selectedLabel = 'Punto seleccionado',
}: PointFieldProps): ReactElement {
  const isOrigin = kind === 'origin';
  const label = isOrigin ? 'Origen' : 'Destino';
  const markerColor = isOrigin ? colors.primary : colors.destination;

  return (
    <View
      className={`min-h-16 flex-row items-center rounded-2xl border ${
        isActive ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
      }`}
    >
      <Pressable
        className="flex-1 min-h-16 px-3 flex-row items-center gap-3 active:opacity-70"
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${coordinate ? selectedLabel : 'Sin seleccionar'}`}
        accessibilityHint={`Toca para elegir el ${label.toLowerCase()} en el mapa`}
        accessibilityState={{ selected: isActive }}
      >
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: markerColor }}
        >
          <Text className="text-white text-sm font-bold">{isOrigin ? 'A' : 'B'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-slate-600">{label}</Text>
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
            {coordinate ? selectedLabel : `Toca el mapa para elegir ${label.toLowerCase()}`}
          </Text>
          {coordinate ? (
            <Text className="text-xs text-slate-600" numberOfLines={1}>
              {coordinate.lat.toFixed(4)}, {coordinate.lng.toFixed(4)}
            </Text>
          ) : null}
        </View>
        {coordinate ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null}
      </Pressable>

      {isOrigin && onUseLocation ? (
        <Pressable
          className="w-12 h-12 mr-1 rounded-full items-center justify-center active:bg-blue-100"
          onPress={onUseLocation}
          disabled={isLocationLoading}
          accessibilityRole="button"
          accessibilityLabel="Usar mi ubicación actual como origen"
          accessibilityState={{ disabled: isLocationLoading, busy: isLocationLoading }}
        >
          {isLocationLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={22} color={colors.primary} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export default function MapScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const {
    location,
    errorMessage: locationNotice,
    isLoading: isLocationLoading,
    isFallback,
    errorKind: locationErrorKind,
    retry: retryLocation,
  } = useLocation();
  const { origin, destination, mode, setOrigin, setDestination, setMode, reset, isCalculating } =
    usePlannerStore();
  const { canSearch, search, errorMessage: searchError } = useRouteSearch();
  const [activePoint, setActivePoint] = useState<ActivePoint>('origin');
  const [showPreferences, setShowPreferences] = useState(false);
  const selectedMode = PLANNER_MODES.find((item) => item.value === mode) ?? PLANNER_MODES[0];

  function handleUseCurrentLocation(): void {
    if (location && !isFallback) {
      setOrigin(location);
      setActivePoint('destination');
    }
  }

  function handleMapSelect(coordinate: LatLng): void {
    if (activePoint === 'origin') {
      setOrigin(coordinate);
      setActivePoint('destination');
    } else {
      setDestination(coordinate);
    }
  }

  function handleReset(): void {
    reset();
    setActivePoint('origin');
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <View className="min-h-14 px-4 py-2 flex-row items-center justify-between bg-white border-b border-slate-200">
        <View className="flex-row items-center gap-2">
          <View className="w-9 h-9 bg-blue-700 rounded-xl items-center justify-center">
            <Ionicons name="bus-outline" size={18} color={colors.white} />
          </View>
          <View>
            <Text className="text-lg font-bold text-slate-900">ColectiGO</Text>
            <Text className="text-xs text-slate-600">Muévete mejor por Huancayo</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-1.5 bg-slate-100 px-3 min-h-9 rounded-full">
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text className="text-xs font-semibold text-slate-700">Huancayo</Text>
        </View>
      </View>

      <View className="flex-1 relative">
        <SelectionMap origin={origin} destination={destination} onSelect={handleMapSelect} />
        <View pointerEvents="none" className="absolute top-3 left-4 right-4 items-center">
          <View
            className="bg-white rounded-full px-4 py-2 flex-row items-center gap-2"
            style={shadows.floating}
          >
            <View
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: activePoint === 'origin' ? colors.primary : colors.destination,
              }}
            />
            <Text className="text-sm font-semibold text-slate-800">
              Selecciona {activePoint === 'origin' ? 'el origen' : 'el destino'}
            </Text>
          </View>
        </View>
      </View>

      <View className="bg-white border-t border-slate-200 px-4 pt-3 pb-3 gap-2">
        <PointField
          kind="origin"
          coordinate={origin}
          isActive={activePoint === 'origin'}
          onPress={() => setActivePoint('origin')}
          onUseLocation={!isFallback ? handleUseCurrentLocation : undefined}
          isLocationLoading={isLocationLoading}
          selectedLabel={origin === location && !isFallback ? 'Mi ubicación actual' : undefined}
        />
        <PointField
          kind="destination"
          coordinate={destination}
          isActive={activePoint === 'destination'}
          onPress={() => setActivePoint('destination')}
        />

        <View className="flex-row items-center gap-2">
          <Pressable
            className="flex-1 min-h-11 px-3 rounded-xl bg-slate-100 flex-row items-center active:bg-slate-200"
            onPress={() => setShowPreferences((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={`Preferencia de ruta: ${selectedMode.label}`}
            accessibilityState={{ expanded: showPreferences }}
          >
            <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
            <Text className="ml-2 text-sm text-slate-600">Preferencia</Text>
            <Text className="ml-1 text-sm font-bold text-slate-900 flex-1" numberOfLines={1}>
              {selectedMode.label}
            </Text>
            <Ionicons
              name={showPreferences ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          {(origin || destination) && (
            <Pressable
              className="w-11 h-11 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"
              onPress={handleReset}
              accessibilityRole="button"
              accessibilityLabel="Limpiar origen y destino"
            >
              <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {showPreferences ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            accessibilityRole="radiogroup"
          >
            {PLANNER_MODES.map((plannerMode) => {
              const selected = mode === plannerMode.value;
              return (
                <Pressable
                  key={plannerMode.value}
                  className={`min-h-11 rounded-full border px-4 items-center justify-center ${
                    selected ? 'border-blue-700 bg-blue-50' : 'border-slate-300 bg-white'
                  }`}
                  onPress={() => {
                    setMode(plannerMode.value);
                    setShowPreferences(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={plannerMode.label}
                  accessibilityHint={plannerMode.description}
                  accessibilityState={{ checked: selected }}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected ? 'text-blue-800' : 'text-slate-700'
                    }`}
                  >
                    {plannerMode.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {locationNotice ? (
          <ErrorBanner
            message={locationNotice}
            variant="info"
            actionLabel={locationErrorKind === 'permission' ? 'Ajustes' : 'Reintentar'}
            onAction={
              locationErrorKind === 'permission'
                ? (): void => {
                    void Linking.openSettings();
                  }
                : retryLocation
            }
          />
        ) : null}
        {searchError ? (
          <ErrorBanner message={searchError} actionLabel="Reintentar" onAction={search} />
        ) : null}

        <Button
          label={canSearch ? 'Ver rutas disponibles' : 'Elige origen y destino'}
          loadingLabel="Calculando rutas…"
          onPress={search}
          disabled={!canSearch}
          isLoading={isCalculating}
          size="lg"
          leftIcon={<Ionicons name="navigate-outline" size={18} color={colors.white} />}
        />
      </View>
    </View>
  );
}
