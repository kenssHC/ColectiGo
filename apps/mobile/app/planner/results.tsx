import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PlannerBadge, PlannerResult } from '@collectigo/shared';
import { usePlannerStore } from '../../src/stores/planner.store';
import { StepCard } from '../../src/components/ui/StepCard';
import { ResultMap } from '../../src/components/map/ResultMap';
import { formatDistance, formatDuration } from '../../src/utils/format';

const BADGE_LABEL: Record<PlannerBadge, string> = {
  fastest: 'Más rápida',
  cheapest: 'Más barata',
  shortest: 'Menor distancia',
  walk_only: 'A pie',
};

const RIDE_COLOR = '#2563EB';

function isWalkOnly(result: PlannerResult): boolean {
  return !result.steps.some((s) => s.type === 'ride');
}

function OptionRow({
  option,
  isSelected,
  isBest,
  onPress,
}: {
  option: PlannerResult;
  isSelected: boolean;
  isBest: boolean;
  onPress: () => void;
}) {
  const icon = isWalkOnly(option) ? 'walk-outline' : 'bus-outline';

  return (
    <TouchableOpacity
      className={`flex-row items-center gap-3 px-4 py-3 rounded-2xl border ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-100'
      }`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${option.routeName ?? 'Opción'}: ${formatDuration(option.totalDuration)}, S/ ${option.totalFare.toFixed(2)}`}
      accessibilityState={{ selected: isSelected }}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          isSelected ? 'bg-blue-600' : 'bg-gray-100'
        }`}
      >
        <Ionicons name={icon} size={18} color={isSelected ? 'white' : '#4B5563'} />
      </View>

      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
            {option.routeName ?? 'Ruta'}
          </Text>
          {isBest ? (
            <View className="px-1.5 py-0.5 rounded-full bg-green-100">
              <Text className="text-[10px] font-bold text-green-700">RECOMENDADA</Text>
            </View>
          ) : null}
        </View>
        {option.companyName ? (
          <Text className="text-[11px] text-gray-500" numberOfLines={1}>
            {option.companyName}
            {option.fleetNumber ? ` · Flota ${option.fleetNumber}` : ''}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {(option.badges ?? []).map((badge) => (
            <Text key={badge} className="text-[11px] text-gray-400">
              {BADGE_LABEL[badge]}
            </Text>
          ))}
        </View>
      </View>

      <View className="items-end gap-0.5">
        <Text className="text-sm font-bold text-gray-900">
          {formatDuration(option.totalDuration)}
        </Text>
        <Text className="text-xs font-semibold text-green-600">
          {option.totalFare > 0 ? `S/ ${option.totalFare.toFixed(2)}` : 'Gratis'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SummaryCard({ result }: { result: PlannerResult }) {
  return (
    <View className="mx-4 my-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <View className="bg-blue-600 px-4 py-2.5 flex-row items-center gap-2">
        <Ionicons
          name={isWalkOnly(result) ? 'walk-outline' : 'navigate-outline'}
          size={16}
          color="white"
        />
        <View className="flex-1">
          <Text className="text-white font-semibold text-sm" numberOfLines={1}>
            {result.label ?? result.routeName ?? 'Recorrido'}
          </Text>
          {result.companyName ? (
            <Text className="text-blue-100 text-xs" numberOfLines={1}>
              {result.routeName} · {result.companyName}
              {result.fleetNumber ? ` · Flota ${result.fleetNumber}` : ''}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row px-4 py-3 gap-0">
        <View className="flex-1 items-center gap-0.5">
          <Text className="text-xl font-bold text-gray-900">
            {formatDistance(result.totalDistance)}
          </Text>
          <Text className="text-xs text-gray-400">Distancia</Text>
        </View>
        <View className="w-px bg-gray-100" />
        <View className="flex-1 items-center gap-0.5">
          <Text className="text-xl font-bold text-gray-900">
            {formatDuration(result.totalDuration)}
          </Text>
          <Text className="text-xs text-gray-400">Tiempo</Text>
        </View>
        <View className="w-px bg-gray-100" />
        <View className="flex-1 items-center gap-0.5">
          <Text className="text-xl font-bold text-green-600">
            {result.totalFare > 0 ? `S/ ${result.totalFare.toFixed(2)}` : 'Gratis'}
          </Text>
          <Text className="text-xs text-gray-400">Costo</Text>
        </View>
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { response, selectedIndex, setSelectedIndex } = usePlannerStore();

  useEffect(() => {
    if (!response) {
      router.replace('/(tabs)/map');
    }
  }, [response]);

  if (!response) {
    return null;
  }

  const options = [response.best, ...response.alternatives];
  const selected = options[selectedIndex] ?? response.best;

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver al mapa"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">Tu mejor ruta</Text>
          <Text className="text-xs text-gray-400">
            {options.length > 1
              ? `${options.length - 1} alternativa${options.length > 2 ? 's' : ''} más`
              : 'Única opción encontrada'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {selected.steps.length === 0 ? (
          <View className="items-center py-16 gap-2">
            <Ionicons name="map-outline" size={40} color="#D1D5DB" />
            <Text className="text-gray-400 text-base font-medium">Sin rutas disponibles</Text>
            <Text className="text-gray-300 text-sm text-center">
              No encontramos cómo llegar{'\n'}entre los puntos seleccionados
            </Text>
          </View>
        ) : (
          <>
            <ResultMap result={selected} rideColor={RIDE_COLOR} />
            <SummaryCard result={selected} />

            {options.length > 1 ? (
              <View className="px-4 pb-2">
                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Opciones de viaje
                </Text>
                <View className="gap-2">
                  {options.map((option, index) => (
                    <OptionRow
                      key={index}
                      option={option}
                      isSelected={index === selectedIndex}
                      isBest={index === 0}
                      onPress={() => setSelectedIndex(index)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View className="px-4 pb-2 pt-2">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Paso a paso
              </Text>
              <View className="bg-white rounded-2xl border border-gray-100 px-4 pt-4 pb-1">
                {selected.steps.map((step, index) => (
                  <StepCard
                    key={index}
                    step={step}
                    index={index}
                    isLast={index === selected.steps.length - 1}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}
