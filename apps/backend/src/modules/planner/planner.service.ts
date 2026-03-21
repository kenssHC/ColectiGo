import { Injectable } from '@nestjs/common';
import type { LatLng, PlannerResponse, PlannerResult, RouteStep } from '@collectigo/shared';
import { RoutesService } from '../routes/routes.service';
import type { RouteEntity } from '../routes/entities/route.entity';
import type { StopEntity } from '../stops/entities/stop.entity';

@Injectable()
export class PlannerService {
  constructor(private readonly routesService: RoutesService) {}

  async calculate(origin: LatLng, destination: LatLng): Promise<PlannerResponse> {
    const routes = await this.routesService.findAll();

    const nearest = this.findNearestStops(origin, destination, routes);

    const shortest = this.buildResult(nearest, origin, destination, 'distance');
    const fastest = this.buildResult(nearest, origin, destination, 'duration');
    const cheapest = this.buildResult(nearest, origin, destination, 'fare');

    return { shortest, fastest, cheapest };
  }

  private findNearestStops(
    origin: LatLng,
    destination: LatLng,
    routes: RouteEntity[],
  ): { boardStop: StopEntity; alightStop: StopEntity; route: RouteEntity } | null {
    let best: { boardStop: StopEntity; alightStop: StopEntity; route: RouteEntity } | null = null;
    let bestDistance = Infinity;

    for (const route of routes) {
      for (const boardStop of route.stops) {
        for (const alightStop of route.stops) {
          if (boardStop.order >= alightStop.order) continue;

          const totalWalk =
            this.haversine(origin, { lat: boardStop.lat, lng: boardStop.lng }) +
            this.haversine(destination, { lat: alightStop.lat, lng: alightStop.lng });

          if (totalWalk < bestDistance) {
            bestDistance = totalWalk;
            best = { boardStop, alightStop, route };
          }
        }
      }
    }

    return best;
  }

  private buildResult(
    match: { boardStop: StopEntity; alightStop: StopEntity; route: RouteEntity } | null,
    origin: LatLng,
    destination: LatLng,
    _mode: 'distance' | 'duration' | 'fare',
  ): PlannerResult {
    if (!match) {
      return { steps: [], totalDistance: 0, totalDuration: 0, totalFare: 0 };
    }

    const { boardStop, alightStop, route } = match;

    const walkToBoard = this.haversine(origin, { lat: boardStop.lat, lng: boardStop.lng });
    const walkFromAlight = this.haversine(destination, {
      lat: alightStop.lat,
      lng: alightStop.lng,
    });

    const ridingStops = route.stops.filter(
      (s) => s.order >= boardStop.order && s.order <= alightStop.order,
    );
    const rideDistance = this.calculatePolylineDistance(ridingStops);

    const steps: RouteStep[] = [
      {
        type: 'walk',
        instruction: `Camina ${Math.round(walkToBoard)}m hasta la parada ${boardStop.name}`,
        distance: Math.round(walkToBoard),
        duration: Math.round((walkToBoard / 80) * 60),
        from: origin,
        to: { lat: boardStop.lat, lng: boardStop.lng },
      },
      {
        type: 'board',
        instruction: `Sube al ${route.type} "${route.name}" en ${boardStop.name}`,
        fare: Number(route.fare),
        routeName: route.name,
        vehicleType: route.type,
      },
      {
        type: 'ride',
        instruction: `Viaja hasta la parada ${alightStop.name}`,
        distance: Math.round(rideDistance),
        duration: Math.round((rideDistance / 300) * 60),
        routeName: route.name,
        vehicleType: route.type,
      },
      {
        type: 'arrive',
        instruction: `Baja en ${alightStop.name} y camina ${Math.round(walkFromAlight)}m hasta tu destino`,
        distance: Math.round(walkFromAlight),
        duration: Math.round((walkFromAlight / 80) * 60),
        from: { lat: alightStop.lat, lng: alightStop.lng },
        to: destination,
      },
    ];

    return {
      steps,
      totalDistance: Math.round(walkToBoard + rideDistance + walkFromAlight),
      totalDuration: steps.reduce((sum, s) => sum + (s.duration ?? 0), 0),
      totalFare: Number(route.fare),
    };
  }

  private haversine(a: LatLng, b: LatLng): number {
    const R = 6371000;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  private calculatePolylineDistance(stops: StopEntity[]): number {
    return stops.reduce((total, stop, index) => {
      if (index === 0) return total;
      const prev = stops[index - 1];
      return total + this.haversine({ lat: prev.lat, lng: prev.lng }, { lat: stop.lat, lng: stop.lng });
    }, 0);
  }
}
