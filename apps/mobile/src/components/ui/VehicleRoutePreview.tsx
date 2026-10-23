import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlannerResult, RouteStep, VehicleType } from '@collectigo/shared';
import { colors } from '../../theme/tokens';
import { getVehiclePresentation } from '../../utils/vehicle-presentation';

export interface VehicleReference {
  routeName: string;
  routeColor?: string;
  vehicleImageUrl?: string | null;
  vehicleType?: VehicleType;
}

interface RouteVehicleReference extends VehicleReference {
  key: string;
}

interface VehicleThumbnailProps {
  reference: VehicleReference;
  size: number;
  onExpand: (reference: VehicleReference) => void;
}

function safeRouteColor(routeColor: string | undefined): string {
  return routeColor && /^#[0-9a-f]{6}$/i.test(routeColor) ? routeColor : colors.primary;
}

function safeImageUrl(imageUrl: string | null | undefined): string | null {
  const trimmed = imageUrl?.trim();
  return trimmed && /^https:\/\/\S+$/i.test(trimmed) ? trimmed : null;
}

function routeReferences(result: PlannerResult): RouteVehicleReference[] {
  const boardSteps = result.steps.filter(
    (step): step is RouteStep & { routeName: string } =>
      step.type === 'board' && Boolean(step.routeName),
  );

  return boardSteps.map((step, index) => ({
    key: `${step.routeId ?? step.routeName}-${index}`,
    routeName: step.routeName,
    routeColor: step.routeColor,
    vehicleType: step.vehicleType,
    vehicleImageUrl:
      step.vehicleImageUrl ?? (boardSteps.length === 1 ? result.vehicleImageUrl : null),
  }));
}

function VehicleThumbnail({ reference, size, onExpand }: VehicleThumbnailProps): ReactElement {
  const imageUrl = safeImageUrl(reference.vehicleImageUrl);
  const vehicle = getVehiclePresentation(reference.vehicleType);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(imageUrl));

  useEffect(() => {
    setHasError(false);
    setIsLoading(Boolean(imageUrl));
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !hasError;

  return (
    <View
      className="overflow-hidden rounded-xl border bg-slate-100"
      style={{
        width: size,
        height: size,
        borderColor: safeRouteColor(reference.routeColor),
      }}
    >
      {showImage ? (
        <Pressable
          className="flex-1"
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onExpand(reference);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Ampliar foto del vehículo de la ruta ${reference.routeName}`}
          accessibilityHint="Abre la fotografía en una vista más grande"
          hitSlop={4}
        >
          <Image
            source={{ uri: imageUrl!, cache: 'force-cache' }}
            className="w-full h-full"
            resizeMode="cover"
            accessible={false}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
          {isLoading ? (
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center bg-slate-100"
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}
          {!isLoading ? (
            <View
              pointerEvents="none"
              className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-tl-lg bg-black/70"
            >
              <Ionicons name="expand-outline" size={11} color={colors.white} />
            </View>
          ) : null}
        </Pressable>
      ) : (
        <View
          className="flex-1 items-center justify-center"
          accessibilityLabel={`${vehicle.label} de la ruta ${reference.routeName}, sin foto referencial`}
        >
          <Ionicons
            name={vehicle.icon}
            size={size >= 48 ? 22 : 18}
            color={colors.textSecondary}
          />
          <Text className="mt-0.5 px-0.5 text-[9px] font-bold text-slate-700" numberOfLines={1}>
            {reference.routeName}
          </Text>
        </View>
      )}
    </View>
  );
}

interface VehicleImageModalProps {
  reference: VehicleReference;
  onClose: () => void;
}

function VehicleImageModal({ reference, onClose }: VehicleImageModalProps): ReactElement {
  const imageUrl = safeImageUrl(reference.vehicleImageUrl);
  const vehicle = getVehiclePresentation(reference.vehicleType);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(imageUrl));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 items-center justify-center bg-black/90 px-4 py-8"
        accessibilityViewIsModal
      >
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessible={false}
        />

        <View
          className="w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
          style={{ maxWidth: 600 }}
        >
          <View className="min-h-14 flex-row items-center border-b border-slate-800 px-4 py-2">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Foto referencial
              </Text>
              <Text className="text-lg font-bold text-white" numberOfLines={1}>
                Ruta {reference.routeName}
              </Text>
            </View>
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-slate-800 active:bg-slate-700"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar fotografía ampliada"
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </Pressable>
          </View>

          <View className="w-full aspect-square items-center justify-center bg-black">
            {imageUrl && !hasError ? (
              <>
                <Image
                  source={{ uri: imageUrl, cache: 'force-cache' }}
                  className="w-full h-full"
                  resizeMode="contain"
                  accessibilityLabel={`Foto ampliada del vehículo de la ruta ${reference.routeName}`}
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                  onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                  }}
                />
                {isLoading ? (
                  <View
                    pointerEvents="none"
                    className="absolute inset-0 items-center justify-center bg-black"
                  >
                    <ActivityIndicator size="large" color={colors.white} />
                    <Text className="mt-3 text-sm text-slate-300">Cargando fotografía…</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View className="items-center px-6">
                <Ionicons name={vehicle.icon} size={44} color={colors.textMuted} />
                <Text className="mt-3 text-center text-sm font-semibold text-slate-200">
                  No se pudo cargar esta fotografía
                </Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  Verifica tu conexión e inténtalo nuevamente.
                </Text>
              </View>
            )}
          </View>

          <Text className="px-4 py-3 text-center text-xs leading-4 text-slate-400">
            La imagen es referencial. Confirma también el código, cartel y color del vehículo.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export function VehicleReferenceImage({
  reference,
  size,
}: {
  reference: VehicleReference;
  size: number;
}): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <VehicleThumbnail
        reference={reference}
        size={size}
        onExpand={() => setIsExpanded(true)}
      />
      {isExpanded ? (
        <VehicleImageModal reference={reference} onClose={() => setIsExpanded(false)} />
      ) : null}
    </>
  );
}

export function VehicleRoutePreview({ result }: { result: PlannerResult }): ReactElement {
  const references = routeReferences(result).slice(0, 2);

  if (references.length === 0) {
    return (
      <View className="w-12 h-12 rounded-full items-center justify-center bg-amber-50 border border-amber-200">
        <Ionicons name="walk-outline" size={21} color={colors.walk} />
      </View>
    );
  }

  const size = references.length > 1 ? 42 : 52;

  return (
    <>
      <View
        className="flex-row items-center gap-1.5"
        accessibilityLabel={references.map((reference) => reference.routeName).join(' y luego ')}
      >
        {references.map((reference, index) => (
          <View key={reference.key} className="flex-row items-center gap-1.5">
            {index > 0 ? (
              <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
            ) : null}
            <VehicleReferenceImage reference={reference} size={size} />
          </View>
        ))}
      </View>
    </>
  );
}
