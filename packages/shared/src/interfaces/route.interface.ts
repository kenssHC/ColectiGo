import type { VehicleType, RouteStatus, RouteDirection } from '../types/transport.types';
import type { LatLng } from './planner.interface';

/**
 * Un recorrido concreto de una ruta: sentido (ida/vuelta) y variante
 * (por ejemplo "con bifurcación"). Los usuarios pueden subir y bajar
 * en cualquier punto de la polilínea.
 */
export interface RoutePath {
  id: string;
  direction: RouteDirection;
  /** null = recorrido principal; texto = variante (ej. "con bifurcación"). */
  variantName: string | null;
  startName: string;
  endName: string;
  coordinates: LatLng[];
}

export interface TransportCompany {
  id: string;
  name: string;
  /** Código único de empresa (ej. TR-0024). */
  code: string;
}

export interface TransportRoute {
  id: string;
  /** Código de línea (ej. TA-11). */
  name: string;
  type: VehicleType;
  fare: number;
  color: string;
  status: RouteStatus;
  startTerminalName: string;
  endTerminalName: string;
  companyName?: string;
  companyCode?: string;
  fleetNumber?: string;
  vehicleImageUrl?: string | null;
  paths?: RoutePath[];
}
