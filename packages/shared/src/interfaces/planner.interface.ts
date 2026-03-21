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
}

export interface PlannerResult {
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  totalFare: number;
}

export interface PlannerResponse {
  shortest: PlannerResult;
  fastest: PlannerResult;
  cheapest: PlannerResult;
}

export interface PlannerRequest {
  origin: LatLng;
  destination: LatLng;
}
