import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PlannerBadge, PlannerResult, VehicleTimeSource } from '@collectigo/shared';
import { usePlannerStore } from '../../src/stores/planner.store';
import { StepCard } from '../../src/components/ui/StepCard';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { ScreenState } from '../../src/components/ui/ScreenState';
import { ResultMap } from '../../src/components/map/ResultMap';
import { formatDistance, formatDuration } from '../../src/utils/format';
import { colors } from '../../src/theme/tokens';

const BADGE_LABEL: Record<PlannerBadge, string> = {
  fastest: 'Más rápida',
  cheapest: 'Más barata',
  shortest: 'Menor distancia',
  less_walking: 'Menos caminata',
  fewer_transfers: 'Menos transbordos',
  walk_only: 'A pie',
};

const TIME_SOURCE_LABEL: Record<VehicleTimeSource, string> = {
  GOOGLE_TRAFFIC: 'Tráfico actual',
  GOOGLE_STATIC: 'Tráfico no disponible',
  LOCAL_ESTIMATE: 'Tiempo estimado',
};

const RIDE_COLOR = colors.primary;

function isWalkOnly(result: PlannerResult): boolean {
  return !result.steps.some((step) => step.type === 'ride');
}

function getTransferCount(result: PlannerResult): number {
  return (
    result.transferCount ??
    Math.max(0, result.steps.filter((step) => step.type === 'ride').length - 1)
  );
}

function getWalkingDistance(result: PlannerResult): number {
  if (result.metrics) return result.metrics.walkingDistance;
  return result.steps
    .filter((step) => ['walk', 'transfer', 'arrive'].includes(step.type))
    .reduce((total, step) => total + (step.distance ?? 0), 0);
}

function getTimeSource(result: PlannerResult): VehicleTimeSource | null {
  const sources = result.steps
    .filter((step) => step.type === 'ride')
    .map((step) => step.timeSource)
    .filter((source): source is VehicleTimeSource => source !== undefined);
  if (sources.includes('LOCAL_ESTIMATE')) return 'LOCAL_ESTIMATE';
  if (sources.includes('GOOGLE_STATIC')) return 'GOOGLE_STATIC';
  if (sources.includes('GOOGLE_TRAFFIC')) return 'GOOGLE_TRAFFIC';
  return null;
}

function transferLabel(count: number): string {
  if (count === 0) return 'Sin transbordos';
  return `${count} transbordo${count === 1 ? '' : 's'}`;
}

interface OptionRowProps {
  option: PlannerResult;
  isSelected: boolean;
  isBest: boolean;
  onPress: () => void;
}

function OptionRow({ option, isSelected, isBest, onPress }: OptionRowProps): ReactElement {
  const transfers = getTransferCount(option);
  const walkingDistance = getWalkingDistance(option);
  const icon = isWalkOnly(option)
    ? 'walk-outline'
    : transfers > 0
      ? 'repeat-outline'
      : 'bus-outline';

  return (
    <Pressable
      className={`min-h-24 flex-row items-center gap-3 px-4 py-3 rounded-2xl border-2 ${
        isSelected ? 'bg-blue-50 border-blue-700' : 'bg-white border-slate-200'
      } active:opacity-80`}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${option.routeName ?? 'Opción'}, ${formatDuration(option.totalDuration)}, ${option.totalFare > 0 ? `S/ ${option.totalFare.toFixed(2)}` : 'gratis'}, ${formatDistance(walkingDistance)} caminando, ${transferLabel(transfers)}`}
      accessibilityState={{ checked: isSelected }}
    >
      <View
        className={`w-11 h-11 rounded-full items-center justify-center ${
          isSelected ? 'bg-blue-700' : 'bg-slate-100'
        }`}
      >
        <Ionicons name={icon} size={20} color={isSelected ? colors.white : colors.textSecondary} />
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
            {option.routeName ?? 'Ruta'}
          </Text>
          {isBest ? (
            <View className="px-2 py-0.5 rounded-full bg-green-100">
              <Text className="text-xs font-bold text-green-800">Recomendada</Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-slate-600" numberOfLines={1}>
          {[
            option.companyName,
            option.fleetNumber ? `Flota ${option.fleetNumber}` : null,
            `${formatDistance(walkingDistance)} caminando`,
            transferLabel(transfers),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {(option.badges ?? []).length > 0 ? (
          <Text className="text-xs text-slate-600" numberOfLines={1}>
            {(option.badges ?? []).map((badge) => BADGE_LABEL[badge]).join(' · ')}
          </Text>
        ) : null}
      </View>

      <View className="items-end gap-1">
        <Text className="text-lg font-bold text-slate-900">
          {formatDuration(option.totalDuration)}
        </Text>
        <Text className="text-sm font-bold text-green-800">
          {option.totalFare > 0 ? `S/ ${option.totalFare.toFixed(2)}` : 'Gratis'}
        </Text>
        {isSelected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
      </View>
    </Pressable>
  );
}

function SummaryCard({ result }: { result: PlannerResult }): ReactElement {
  const transfers = getTransferCount(result);
  const walkingDistance = getWalkingDistance(result);
  const timeSource = getTimeSource(result);

  return (
    <View className="mx-4 my-3 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <View className="bg-blue-700 px-4 py-3 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
          <Ionicons
            name={isWalkOnly(result) ? 'walk-outline' : 'navigate-outline'}
            size={20}
            color={colors.white}
          />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {result.label ?? 'Opción seleccionada'}
          </Text>
          <Text className="text-blue-100 text-sm" numberOfLines={1}>
            {[result.routeName ?? 'Recorrido', result.companyName].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <View className="px-4 py-4 gap-3">
        <View className="flex-row items-end justify-between gap-4">
          <View>
            <Text className="text-3xl font-bold text-slate-900">
              {formatDuration(result.totalDuration)}
            </Text>
            <Text className="text-sm text-slate-600">Tiempo total estimado</Text>
          </View>
          <View className="items-end">
            <Text className="text-xl font-bold text-green-800">
              {result.totalFare > 0 ? `S/ ${result.totalFare.toFixed(2)}` : 'Gratis'}
            </Text>
            <Text className="text-sm text-slate-600">Tarifa total</Text>
          </View>
        </View>

        <View className="h-px bg-slate-200" />

        <View className="flex-row flex-wrap gap-x-4 gap-y-2">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="walk-outline" size={16} color={colors.textSecondary} />
            <Text className="text-sm text-slate-700">
              {formatDistance(walkingDistance)} caminando
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="repeat-outline" size={16} color={colors.textSecondary} />
            <Text className="text-sm text-slate-700">{transferLabel(transfers)}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
            <Text className="text-sm text-slate-700">
              {formatDistance(result.totalDistance)} en total
            </Text>
          </View>
          {timeSource ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name={timeSource === 'GOOGLE_TRAFFIC' ? 'car-outline' : 'time-outline'}
                size={16}
                color={colors.textSecondary}
              />
              <Text className="text-sm text-slate-700">{TIME_SOURCE_LABEL[timeSource]}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ResultsScreen(): ReactElement | null {
  const insets = useSafeAreaInsets();
  const { response, selectedIndex, setSelectedIndex } = usePlannerStore();

  useEffect(() => {
    if (!response) router.replace('/(tabs)/map');
  }, [response]);

  if (!response) return null;

  const options = [response.best, ...response.alternatives];
  const selected = options[selectedIndex] ?? response.best;
  const headerSubtitle =
    options.length > 1 ? `${options.length} opciones para comparar` : 'Una opción encontrada';

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <ScreenHeader
        title="Opciones de viaje"
        subtitle={headerSubtitle}
        onBack={() => router.back()}
        backLabel="Volver y cambiar los puntos"
      />

      {selected.steps.length === 0 ? (
        <ScreenState
          title="No encontramos una ruta"
          message="Prueba moviendo el origen o el destino y vuelve a calcular."
          icon="map-outline"
          actionLabel="Cambiar puntos"
          onAction={() => router.back()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          <ResultMap result={selected} rideColor={RIDE_COLOR} />

          {options.length > 1 ? (
            <View className="px-4 pt-3 pb-1" accessibilityRole="radiogroup">
              <Text className="text-sm font-bold text-slate-800 mb-2">Compara las opciones</Text>
              <View className="gap-2">
                {options.map((option, index) => (
                  <OptionRow
                    key={`${option.routeName ?? 'option'}-${index}`}
                    option={option}
                    isSelected={index === selectedIndex}
                    isBest={index === 0}
                    onPress={() => setSelectedIndex(index)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <SummaryCard result={selected} />

          <View className="px-4 pb-2 pt-2">
            <Text className="text-sm font-bold text-slate-800 mb-3">Paso a paso</Text>
            <View className="bg-white rounded-2xl border border-slate-200 px-4 pt-4 pb-1">
              {selected.steps.map((step, index) => (
                <StepCard
                  key={`${step.type}-${index}`}
                  step={step}
                  index={index}
                  isLast={index === selected.steps.length - 1}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
