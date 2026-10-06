import type { RouteStepType, VehicleType } from '../types/transport.types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteStep {
  type: RouteStepType;
  instruction: string;
  distance?: number;
  duration?: number;
  fare?: number;
  routeName?: string;
  vehicleType?: VehicleType;
  polyline?: string;
  from?: LatLng;
  to?: LatLng;
  /** Coordenadas del recorrido (paradas intermedias incluidas), para dibujar en el mapa. */
  path?: LatLng[];
}

/** Distintivos que explican en qué destaca una opción de viaje. */
export type PlannerBadge = 'fastest' | 'cheapest' | 'shortest' | 'walk_only';

export interface PlannerResult {
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  totalFare: number;
  /** Nombre de la ruta de transporte usada, o "A pie" si no usa vehículo. */
  routeName?: string;
  companyName?: string;
  fleetNumber?: string;
  vehicleImageUrl?: string | null;
  /** Razón por la que se recomienda esta opción (solo en la mejor ruta). */
  label?: string;
  badges?: PlannerBadge[];
  /** Puntaje combinado tiempo/costo/distancia (menor = mejor). */
  score?: number;
}

export interface PlannerResponse {
  /** La opción recomendada según el puntaje combinado. */
  best: PlannerResult;
  /** Otras opciones razonables, ordenadas de mejor a peor. */
  alternatives: PlannerResult[];
}

export interface PlannerRequest {
  origin: LatLng;
  destination: LatLng;
}
