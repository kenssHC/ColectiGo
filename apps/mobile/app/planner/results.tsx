import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlannerStore } from '../../src/stores/planner.store';
import { StepCard } from '../../src/components/ui/StepCard';
import type { PlannerMode, PlannerResult } from '@collectigo/shared';

interface ModeOption {
  key: PlannerMode;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeColor: string;
  activeBg: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    key: 'shortest',
    label: 'Más corta',
    sublabel: 'Menor distancia',
    icon: 'resize-outline',
    activeColor: '#2563EB',
    activeBg: 'bg-blue-600',
  },
  {
    key: 'fastest',
    label: 'Menos tiempo',
    sublabel: 'Ruta más rápida',
    icon: 'flash-outline',
    activeColor: '#D97706',
    activeBg: 'bg-amber-500',
  },
  {
    key: 'cheapest',
    label: 'Más barato',
    sublabel: 'Menor costo',
    icon: 'wallet-outline',
    activeColor: '#16A34A',
    activeBg: 'bg-green-600',
  },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function SummaryCard({ result, mode }: { result: PlannerResult; mode: ModeOption }) {
  return (
    <View className="mx-4 my-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <View className={`${mode.activeBg} px-4 py-2.5 flex-row items-center gap-2`}>
        <Ionicons name={mode.icon} size={16} color="white" />
        <Text className="text-white font-semibold text-sm">{mode.label}</Text>
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
            S/ {result.totalFare.toFixed(2)}
          </Text>
          <Text className="text-xs text-gray-400">Costo</Text>
        </View>
      </View>
    </View>
  );
}

export default function ResultsScreen() {
  const { result, selectedMode, setSelectedMode } = usePlannerStore();

  if (!result) {
    router.replace('/(tabs)/map');
    return null;
  }

  const activeResult: PlannerResult = result[selectedMode];
  const activeMode = MODE_OPTIONS.find((m) => m.key === selectedMode) ?? MODE_OPTIONS[0];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row items-center gap-3">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">Rutas disponibles</Text>
          <Text className="text-xs text-gray-400">{activeResult.steps.length} pasos</Text>
        </View>
      </View>

      <View className="bg-white border-b border-gray-100 px-4 py-3 flex-row gap-2">
        {MODE_OPTIONS.map((mode) => {
          const isActive = selectedMode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              className={`flex-1 rounded-xl py-2.5 px-2 items-center gap-0.5 border ${
                isActive ? `${mode.activeBg} border-transparent` : 'bg-gray-50 border-gray-100'
              }`}
              onPress={() => setSelectedMode(mode.key)}
            >
              <Ionicons
                name={mode.icon}
                size={16}
                color={isActive ? 'white' : mode.activeColor}
              />
              <Text
                className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <SummaryCard result={activeResult} mode={activeMode} />

        <View className="px-4 pb-2">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Paso a paso
          </Text>

          {activeResult.steps.length === 0 ? (
            <View className="items-center py-12 gap-2">
              <Ionicons name="map-outline" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 text-base font-medium">Sin rutas disponibles</Text>
              <Text className="text-gray-300 text-sm text-center">
                Agrega rutas de transporte para ver resultados
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-gray-100 px-4 pt-4 pb-1">
              {activeResult.steps.map((step, index) => (
                <StepCard
                  key={index}
                  step={step}
                  index={index}
                  isLast={index === activeResult.steps.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
