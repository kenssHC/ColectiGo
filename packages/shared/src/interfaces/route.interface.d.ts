import type { VehicleType, RouteStatus } from '../types/transport.types';
export interface Stop {
    id: string;
    name: string;
    order: number;
    lat: number;
    lng: number;
}
export interface TransportRoute {
    id: string;
    name: string;
    type: VehicleType;
    fare: number;
    color: string;
    status: RouteStatus;
    stops: Stop[];
    polyline: string | null;
}
