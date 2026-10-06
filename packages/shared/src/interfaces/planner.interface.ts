import type { PlannerMode, RouteStepType, VehicleType } from '../types/transport.types';

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
  routeId?: string;
  routeName?: string;
  routeColor?: string;
  vehicleType?: VehicleType;
  polyline?: string;
  from?: LatLng;
  to?: LatLng;
  /** Coordenadas del recorrido (paradas intermedias incluidas), para dibujar en el mapa. */
  path?: LatLng[];
}

/** Distintivos que explican en qué destaca una opción de viaje. */
export type PlannerBadge =
  | 'fastest'
  | 'cheapest'
  | 'shortest'
  | 'less_walking'
  | 'fewer_transfers'
  | 'walk_only';

/** Desglose usado para evaluar una opción sin depender de sus alternativas. */
export interface PlannerMetrics {
  vehicleMinutes: number;
  walkingMinutes: number;
  waitingMinutes: number;
  walkingDistance: number;
  transferCount: number;
}

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
  /** Cantidad de cambios de vehículo realizados durante el viaje. */
  transferCount?: number;
  metrics?: PlannerMetrics;
  /** Costo generalizado en minutos equivalentes (menor = mejor). */
  generalizedCost?: number;
  /** Razón por la que se recomienda esta opción (solo en la mejor ruta). */
  label?: string;
  badges?: PlannerBadge[];
  /** Alias compatible de generalizedCost (menor = mejor). */
  score?: number;
}

export interface PlannerResponse {
  /** La opción recomendada según el modo y su costo generalizado. */
  best: PlannerResult;
  /** Otras opciones Pareto-óptimas y diversas. */
  alternatives: PlannerResult[];
}

export interface PlannerRequest {
  origin: LatLng;
  destination: LatLng;
  mode?: PlannerMode;
}
