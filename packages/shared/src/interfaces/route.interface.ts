import type { VehicleType, RouteStatus } from '../types/transport.types';
import type { LatLng } from './planner.interface';

export interface Stop {
  id: string;
  name: string;
  order: number;
  position: LatLng;
}

export interface TransportRoute {
  id: string;
  name: string;
  type: VehicleType;
  fare: number;
  color: string;
  status: RouteStatus;
  stops: Stop[];
  polyline: string;
}
