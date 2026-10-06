import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteStep } from '@collectigo/shared';
import { formatDistance, formatDuration } from '../../utils/format';

interface StepCardProps {
  step: RouteStep;
  index: number;
  isLast: boolean;
}

const STEP_CONFIG: Record<
  RouteStep['type'],
  { icon: keyof typeof Ionicons.glyphMap; bgColor: string; iconColor: string; borderColor: string }
> = {
  walk: {
    icon: 'walk-outline',
    bgColor: 'bg-amber-50',
    iconColor: '#D97706',
    borderColor: 'border-amber-200',
  },
  board: {
    icon: 'bus-outline',
    bgColor: 'bg-green-50',
    iconColor: '#16A34A',
    borderColor: 'border-green-200',
  },
  ride: {
    icon: 'navigate-outline',
    bgColor: 'bg-blue-50',
    iconColor: '#2563EB',
    borderColor: 'border-blue-200',
  },
  transfer: {
    icon: 'repeat-outline',
    bgColor: 'bg-purple-50',
    iconColor: '#9333EA',
    borderColor: 'border-purple-200',
  },
  arrive: {
    icon: 'location-outline',
    bgColor: 'bg-red-50',
    iconColor: '#DC2626',
    borderColor: 'border-red-200',
  },
};

const VEHICLE_LABEL: Record<string, string> = {
  colectivo: 'Colectivo',
  auto: 'Auto',
  combi: 'Combi',
  bus: 'Bus',
};

export function StepCard({ step, index, isLast }: StepCardProps) {
  const config = STEP_CONFIG[step.type];

  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          className={`w-9 h-9 rounded-full items-center justify-center border ${config.bgColor} ${config.borderColor}`}
        >
          <Ionicons name={config.icon} size={18} color={config.iconColor} />
        </View>
        {!isLast ? <View className="w-0.5 flex-1 bg-gray-200 mt-1" /> : null}
      </View>

      <View className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <View className="flex-row items-center gap-2 mb-1">
          <View className="w-5 h-5 rounded-full bg-gray-100 items-center justify-center">
            <Text className="text-xs font-bold text-gray-500">{index + 1}</Text>
          </View>
          {step.vehicleType ? (
            <View className={`px-2 py-0.5 rounded-full ${config.bgColor} border ${config.borderColor}`}>
              <Text className="text-xs font-medium" style={{ color: config.iconColor }}>
                {VEHICLE_LABEL[step.vehicleType] ?? step.vehicleType}
              </Text>
            </View>
          ) : null}
          {step.routeName ? (
            <Text className="text-xs text-gray-400 flex-1" numberOfLines={1}>
              {step.routeName}
            </Text>
          ) : null}
        </View>

        <Text className="text-sm font-medium text-gray-800 leading-5">{step.instruction}</Text>

        <View className="flex-row gap-3 mt-1.5">
          {step.distance !== undefined ? (
            <Text className="text-xs text-gray-400">{formatDistance(step.distance)}</Text>
          ) : null}
          {step.duration !== undefined ? (
            <Text className="text-xs text-gray-400">{formatDuration(step.duration)}</Text>
          ) : null}
          {step.fare !== undefined ? (
            <Text className="text-xs font-semibold text-green-600">S/ {step.fare.toFixed(2)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
