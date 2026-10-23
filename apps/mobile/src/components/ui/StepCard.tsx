import type { ReactElement } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteStep } from '@collectigo/shared';
import { formatDistance, formatDuration } from '../../utils/format';
import { colors } from '../../theme/tokens';
import { getVehiclePresentation } from '../../utils/vehicle-presentation';
import { VehicleReferenceImage } from './VehicleRoutePreview';

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
    iconColor: colors.warning,
    borderColor: 'border-amber-200',
  },
  board: {
    icon: 'bus-outline',
    bgColor: 'bg-green-50',
    iconColor: colors.success,
    borderColor: 'border-green-200',
  },
  ride: {
    icon: 'navigate-outline',
    bgColor: 'bg-blue-50',
    iconColor: colors.primary,
    borderColor: 'border-blue-200',
  },
  transfer: {
    icon: 'repeat-outline',
    bgColor: 'bg-purple-50',
    iconColor: colors.transfer,
    borderColor: 'border-purple-200',
  },
  arrive: {
    icon: 'location-outline',
    bgColor: 'bg-red-50',
    iconColor: colors.error,
    borderColor: 'border-red-200',
  },
};

function normalizedText(value: string): string {
  return value.toLocaleLowerCase('es').replace(/\s+/g, '');
}

function instructionIncludes(instruction: string, value: string): boolean {
  return normalizedText(instruction).includes(normalizedText(value));
}

function getStepAccessibilityLabel(step: RouteStep, index: number): string {
  const details: string[] = [`Paso ${index + 1}`, step.instruction];

  if (
    step.distance !== undefined &&
    !instructionIncludes(step.instruction, `${Math.round(step.distance)}m`) &&
    !instructionIncludes(step.instruction, formatDistance(step.distance))
  ) {
    details.push(`Distancia ${formatDistance(step.distance)}`);
  }
  if (
    step.duration !== undefined &&
    !instructionIncludes(step.instruction, formatDuration(step.duration))
  ) {
    details.push(`Duración ${formatDuration(step.duration)}`);
  }
  if (
    step.fare !== undefined &&
    !instructionIncludes(step.instruction, `S/ ${step.fare.toFixed(2)}`)
  ) {
    details.push(`Tarifa S/ ${step.fare.toFixed(2)}`);
  }

  return details.join('. ');
}

export function StepCard({ step, index, isLast }: StepCardProps): ReactElement {
  const config = STEP_CONFIG[step.type];
  const vehicle = getVehiclePresentation(step.vehicleType);
  const stepIcon = step.type === 'board' ? vehicle.icon : config.icon;

  return (
    <View className="flex-row gap-3">
      <View className="items-center" importantForAccessibility="no-hide-descendants">
        <View
          className={`w-9 h-9 rounded-full items-center justify-center border ${config.bgColor} ${config.borderColor}`}
        >
          <Ionicons name={stepIcon} size={18} color={config.iconColor} />
        </View>
        {!isLast ? <View className="w-0.5 flex-1 bg-gray-200 mt-1" /> : null}
      </View>

      <View className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <View
          className="flex-row items-center gap-2 mb-1"
          importantForAccessibility="no-hide-descendants"
        >
          <View className="w-5 h-5 rounded-full bg-gray-100 items-center justify-center">
            <Text className="text-xs font-bold text-gray-500">{index + 1}</Text>
          </View>
          {step.vehicleType ? (
            <View
              className={`px-2 py-0.5 rounded-full ${config.bgColor} border ${config.borderColor}`}
            >
              <Text className="text-xs font-medium" style={{ color: config.iconColor }}>
                {vehicle.label}
              </Text>
            </View>
          ) : null}
          {step.routeName ? (
            <Text className="text-sm leading-5 text-slate-600 flex-1">
              {step.routeName}
            </Text>
          ) : null}
        </View>

        <View className="flex-row gap-3">
          <View
            className="flex-1"
            accessible
            accessibilityLabel={getStepAccessibilityLabel(step, index)}
          >
            <Text className="text-sm font-medium text-slate-800 leading-5">
              {step.instruction}
            </Text>

            <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {step.distance !== undefined ? (
                <Text className="text-sm text-slate-600">{formatDistance(step.distance)}</Text>
              ) : null}
              {step.duration !== undefined ? (
                <Text className="text-sm text-slate-600">{formatDuration(step.duration)}</Text>
              ) : null}
              {step.fare !== undefined ? (
                <Text className="text-sm font-semibold text-green-800">
                  S/ {step.fare.toFixed(2)}
                </Text>
              ) : null}
            </View>
          </View>

          {step.type === 'board' ? (
            <VehicleReferenceImage
              reference={{
                routeName: step.routeName ?? 'Ruta',
                routeColor: step.routeColor,
                vehicleImageUrl: step.vehicleImageUrl,
                vehicleType: step.vehicleType,
              }}
              size={58}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
