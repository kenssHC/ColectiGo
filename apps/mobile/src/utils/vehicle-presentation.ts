import type { Ionicons } from '@expo/vector-icons';
import type { VehicleType } from '@collectigo/shared';

export interface VehiclePresentation {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const VEHICLE_PRESENTATION: Record<VehicleType, VehiclePresentation> = {
  colectivo: { label: 'Colectivo', icon: 'car-outline' },
  auto: { label: 'Auto', icon: 'car-outline' },
  combi: { label: 'Combi', icon: 'car-sport-outline' },
  bus: { label: 'Bus', icon: 'bus-outline' },
};

const UNKNOWN_VEHICLE_PRESENTATION: VehiclePresentation = {
  label: 'Vehículo',
  icon: 'car-outline',
};

/** Presentación visual centralizada; nunca infiere el tipo desde el nombre de ruta. */
export function getVehiclePresentation(
  vehicleType: VehicleType | null | undefined,
): VehiclePresentation {
  return vehicleType ? VEHICLE_PRESENTATION[vehicleType] : UNKNOWN_VEHICLE_PRESENTATION;
}
