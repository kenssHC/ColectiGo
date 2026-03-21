import type { RouteEntity } from '../../routes/entities/route.entity';
import type { StopEntity } from '../../stops/entities/stop.entity';

export interface GraphNode {
  stopId: string;
  routeId: string;
  lat: number;
  lng: number;
  name: string;
}

export interface GraphEdge {
  from: GraphNode;
  to: GraphNode;
  route: RouteEntity;
  distanceMeters: number;
  durationSeconds: number;
  fare: number;
}

export interface TransportGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

export interface RouteStepInternal {
  type: 'walk' | 'board' | 'ride' | 'transfer' | 'arrive';
  instruction: string;
  distance?: number;
  duration?: number;
  fare?: number;
  routeName?: string;
  vehicleType?: string;
  polyline?: string;
  fromStop?: StopEntity;
  toStop?: StopEntity;
}
