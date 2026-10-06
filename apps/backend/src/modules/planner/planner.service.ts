import { Injectable } from '@nestjs/common';
import type {
  LatLng,
  PlannerBadge,
  PlannerResponse,
  PlannerResult,
  RouteStep,
} from '@collectigo/shared';
import { RoutesService } from '../routes/routes.service';
import { WalkRoutingService } from './walk-routing.service';
import { TrafficService } from './traffic.service';
import type { RouteEntity } from '../routes/entities/route.entity';
import type { RoutePathEntity } from '../routes/entities/route-path.entity';

const EARTH_RADIUS_METERS = 6_371_000;
const WALK_SPEED_METERS_PER_MIN = 80;
const VEHICLE_SPEED_METERS_PER_MIN = 300;

/** Espera promedio estimada del vehículo en el punto de subida. */
const WAIT_SECONDS = 240;
/** Tramos en vehículo menores a esto no tienen sentido (mejor caminar). */
const MIN_RIDE_METERS = 150;
/** Más allá de esta distancia no se ofrece ir caminando directo. */
const MAX_DIRECT_WALK_METERS = 2_500;
/** Cuántos candidatos de transporte se enriquecen con datos externos. */
const MAX_ENRICHED_CANDIDATES = 4;
const MAX_ALTERNATIVES = 3;

/** Pesos del puntaje combinado: el tiempo pesa más que el costo y la distancia. */
const WEIGHT_TIME = 0.5;
const WEIGHT_COST = 0.3;
const WEIGHT_DISTANCE = 0.2;

const VEHICLE_LABEL: Record<string, string> = {
  colectivo: 'colectivo',
  auto: 'auto',
  combi: 'combi',
  bus: 'bus',
};

/** Proyección de un punto sobre una polilínea. */
interface PathProjection {
  /** Punto exacto sobre el recorrido (donde subir o bajar). */
  point: LatLng;
  /** Distancia a pie desde/hacia el punto consultado, en metros. */
  walkDistance: number;
  /** Distancia acumulada desde el inicio del recorrido, en metros. */
  along: number;
  /** Segmento de la polilínea donde cae la proyección. */
  segmentIndex: number;
}

interface TripCandidate {
  route: RouteEntity;
  path: RoutePathEntity;
  boardPoint: LatLng;
  alightPoint: LatLng;
  ridePath: LatLng[];
  walkToBoard: number;
  walkFromAlight: number;
  rideDistance: number;
  totalDistance: number;
  totalDurationSeconds: number;
  fare: number;
}

interface TripOption {
  result: PlannerResult;
  isWalkOnly: boolean;
}

@Injectable()
export class PlannerService {
  constructor(
    private readonly routesService: RoutesService,
    private readonly walkRouting: WalkRoutingService,
    private readonly traffic: TrafficService,
  ) {}

  async calculate(origin: LatLng, destination: LatLng): Promise<PlannerResponse> {
    const routes = await this.routesService.findAll();
    const candidates = this.buildCandidates(origin, destination, routes);

    // Preselección con distancias en línea recta (sin llamadas externas):
    // el mejor candidato por ruta, y de estos solo los mejores globales.
    const preselected = this.preselect(candidates);

    const directWalkDistance = this.haversine(origin, destination);
    const includeWalkOnly = directWalkDistance <= MAX_DIRECT_WALK_METERS;

    // Solo los finalistas se enriquecen con datos reales: caminatas por
    // calles (OSRM) y tráfico actual del tramo en vehículo (Google Routes).
    const options: TripOption[] = await Promise.all([
      ...preselected.map(async (candidate) => ({
        result: await this.buildTransitResult(candidate, origin, destination),
        isWalkOnly: false,
      })),
      ...(includeWalkOnly
        ? [
            (async () => ({
              result: await this.buildWalkOnlyResult(origin, destination, directWalkDistance),
              isWalkOnly: true,
            }))(),
          ]
        : []),
    ]);

    if (options.length === 0) {
      const empty: PlannerResult = { steps: [], totalDistance: 0, totalDuration: 0, totalFare: 0 };
      return { best: empty, alternatives: [] };
    }

    this.assignScores(options);
    this.assignBadges(options);

    const sorted = [...options].sort((a, b) => (a.result.score ?? 0) - (b.result.score ?? 0));
    const best = sorted[0].result;
    best.label = this.buildLabel(sorted[0]);

    return {
      best,
      alternatives: sorted.slice(1, 1 + MAX_ALTERNATIVES).map((o) => o.result),
    };
  }

  /**
   * Los pasajeros suben y bajan en cualquier punto del recorrido: se proyecta
   * el origen y el destino sobre cada polilínea (ida/vuelta y variantes) y se
   * descartan las combinaciones que irían contra el sentido de la ruta.
   */
  private buildCandidates(
    origin: LatLng,
    destination: LatLng,
    routes: RouteEntity[],
  ): TripCandidate[] {
    const candidates: TripCandidate[] = [];

    for (const route of routes) {
      for (const path of route.paths ?? []) {
        const coords = path.coordinates ?? [];
        if (coords.length < 2) continue;

        const cumulative = this.cumulativeDistances(coords);
        const board = this.projectOntoPath(origin, coords, cumulative);
        const alight = this.projectOntoPath(destination, coords, cumulative);

        // El punto de bajada debe estar más adelante que el de subida.
        const rideDistance = alight.along - board.along;
        if (rideDistance < MIN_RIDE_METERS) continue;

        const ridePath: LatLng[] = [
          board.point,
          ...coords.slice(board.segmentIndex + 1, alight.segmentIndex + 1),
          alight.point,
        ];

        const walkDurationSeconds =
          ((board.walkDistance + alight.walkDistance) / WALK_SPEED_METERS_PER_MIN) * 60;
        const rideDurationSeconds = (rideDistance / VEHICLE_SPEED_METERS_PER_MIN) * 60;

        candidates.push({
          route,
          path,
          boardPoint: board.point,
          alightPoint: alight.point,
          ridePath,
          walkToBoard: board.walkDistance,
          walkFromAlight: alight.walkDistance,
          rideDistance,
          totalDistance: board.walkDistance + rideDistance + alight.walkDistance,
          totalDurationSeconds: walkDurationSeconds + rideDurationSeconds + WAIT_SECONDS,
          fare: Number(route.fare),
        });
      }
    }

    return candidates;
  }

  /**
   * Se queda con el mejor recorrido de cada ruta (por puntaje preliminar) y
   * limita el total, para acotar las llamadas a servicios externos.
   */
  private preselect(candidates: TripCandidate[]): TripCandidate[] {
    if (candidates.length === 0) return [];

    const durations = candidates.map((c) => c.totalDurationSeconds);
    const fares = candidates.map((c) => c.fare);
    const distances = candidates.map((c) => c.totalDistance);

    const score = (c: TripCandidate): number =>
      WEIGHT_TIME * this.normalize(c.totalDurationSeconds, durations) +
      WEIGHT_COST * this.normalize(c.fare, fares) +
      WEIGHT_DISTANCE * this.normalize(c.totalDistance, distances);

    const bestPerRoute = new Map<string, TripCandidate>();
    for (const candidate of candidates) {
      const current = bestPerRoute.get(candidate.route.id);
      if (!current || score(candidate) < score(current)) {
        bestPerRoute.set(candidate.route.id, candidate);
      }
    }

    return [...bestPerRoute.values()]
      .sort((a, b) => score(a) - score(b))
      .slice(0, MAX_ENRICHED_CANDIDATES);
  }

  private async buildTransitResult(
    candidate: TripCandidate,
    origin: LatLng,
    destination: LatLng,
  ): Promise<PlannerResult> {
    const { route, path, boardPoint, alightPoint, ridePath, rideDistance } = candidate;

    const company = route.fleet?.company;
    const fleetNumber = route.fleet?.number;
    const vehicleLabel = VEHICLE_LABEL[route.type] ?? 'vehículo';
    const variantSuffix = path.variantName ? ` (${path.variantName})` : '';

    // Caminatas por calles (OSRM) y duración del tramo con tráfico (Google).
    // Si alguno falla se usa el cálculo local (Haversine / velocidad por hora).
    const [walkInPath, walkOutPath, trafficSeconds] = await Promise.all([
      this.walkRouting.getWalkPath(origin, boardPoint),
      this.walkRouting.getWalkPath(alightPoint, destination),
      this.traffic.getRideDurationSeconds(ridePath),
    ]);

    const walkInDistance = walkInPath?.distance ?? candidate.walkToBoard;
    const walkOutDistance = walkOutPath?.distance ?? candidate.walkFromAlight;

    const fallbackRideSeconds =
      (rideDistance / (VEHICLE_SPEED_METERS_PER_MIN * this.traffic.getSpeedFactor())) * 60;
    const rideSeconds = Math.round(trafficSeconds ?? fallbackRideSeconds);

    const companyLabel = company ? ` de ${company.name}` : '';
    const fleetLabel = fleetNumber ? ` (flota ${fleetNumber})` : '';

    const steps: RouteStep[] = [
      {
        type: 'walk',
        instruction: `Camina ${Math.round(walkInDistance)}m hasta el punto de subida de la ruta ${route.name}`,
        distance: Math.round(walkInDistance),
        duration: Math.round((walkInDistance / WALK_SPEED_METERS_PER_MIN) * 60),
        from: origin,
        to: boardPoint,
        ...(walkInPath ? { path: walkInPath.path } : {}),
      },
      {
        type: 'board',
        instruction: `Sube al ${vehicleLabel} ${route.name}${companyLabel}${fleetLabel} — espera aprox. ${Math.round(WAIT_SECONDS / 60)} min`,
        duration: WAIT_SECONDS,
        fare: candidate.fare,
        routeName: route.name,
        vehicleType: route.type,
      },
      {
        type: 'ride',
        instruction: `Viaja por la ruta ${route.name}${variantSuffix} hasta el punto de bajada`,
        distance: Math.round(rideDistance),
        duration: rideSeconds,
        routeName: route.name,
        vehicleType: route.type,
        from: boardPoint,
        to: alightPoint,
        path: ridePath,
      },
      {
        type: 'arrive',
        instruction: `Baja del ${vehicleLabel} y camina ${Math.round(walkOutDistance)}m hasta tu destino`,
        distance: Math.round(walkOutDistance),
        duration: Math.round((walkOutDistance / WALK_SPEED_METERS_PER_MIN) * 60),
        from: alightPoint,
        to: destination,
        ...(walkOutPath ? { path: walkOutPath.path } : {}),
      },
    ];

    return {
      steps,
      totalDistance: Math.round(walkInDistance + rideDistance + walkOutDistance),
      totalDuration: steps.reduce((sum, s) => sum + (s.duration ?? 0), 0),
      totalFare: candidate.fare,
      routeName: route.name,
      ...(company ? { companyName: company.name } : {}),
      ...(fleetNumber ? { fleetNumber } : {}),
      ...(route.fleet?.vehicleImageUrl ? { vehicleImageUrl: route.fleet.vehicleImageUrl } : {}),
    };
  }

  private async buildWalkOnlyResult(
    origin: LatLng,
    destination: LatLng,
    directDistance: number,
  ): Promise<PlannerResult> {
    const walkPath = await this.walkRouting.getWalkPath(origin, destination);
    const distance = walkPath?.distance ?? directDistance;
    const duration = Math.round((distance / WALK_SPEED_METERS_PER_MIN) * 60);

    const step: RouteStep = {
      type: 'walk',
      instruction: `Camina ${Math.round(distance)}m hasta tu destino`,
      distance: Math.round(distance),
      duration,
      from: origin,
      to: destination,
      ...(walkPath ? { path: walkPath.path } : {}),
    };

    return {
      steps: [step],
      totalDistance: Math.round(distance),
      totalDuration: duration,
      totalFare: 0,
      routeName: 'A pie',
    };
  }

  /** Puntaje combinado normalizado (menor = mejor) sobre el conjunto final. */
  private assignScores(options: TripOption[]): void {
    const durations = options.map((o) => o.result.totalDuration);
    const fares = options.map((o) => o.result.totalFare);
    const distances = options.map((o) => o.result.totalDistance);

    for (const option of options) {
      option.result.score =
        Math.round(
          (WEIGHT_TIME * this.normalize(option.result.totalDuration, durations) +
            WEIGHT_COST * this.normalize(option.result.totalFare, fares) +
            WEIGHT_DISTANCE * this.normalize(option.result.totalDistance, distances)) *
            1000,
        ) / 1000;
    }
  }

  private assignBadges(options: TripOption[]): void {
    const minDuration = Math.min(...options.map((o) => o.result.totalDuration));
    const minDistance = Math.min(...options.map((o) => o.result.totalDistance));
    const transitFares = options.filter((o) => !o.isWalkOnly).map((o) => o.result.totalFare);
    const minFare = transitFares.length > 0 ? Math.min(...transitFares) : null;

    for (const option of options) {
      const badges: PlannerBadge[] = [];
      if (option.isWalkOnly) badges.push('walk_only');
      if (option.result.totalDuration === minDuration) badges.push('fastest');
      if (!option.isWalkOnly && minFare !== null && option.result.totalFare === minFare) {
        badges.push('cheapest');
      }
      if (option.result.totalDistance === minDistance) badges.push('shortest');
      option.result.badges = badges;
    }
  }

  private buildLabel(option: TripOption): string {
    const badges = option.result.badges ?? [];
    if (option.isWalkOnly) return 'Mejor llegar caminando';
    if (badges.includes('fastest') && badges.includes('cheapest')) {
      return 'La más rápida y barata';
    }
    if (badges.includes('fastest')) return 'La más rápida';
    if (badges.includes('cheapest')) return 'La más barata';
    if (badges.includes('shortest')) return 'La de menor distancia';
    return 'La opción más equilibrada';
  }

  /** Normalización min-max a [0, 1]; 0 es el mejor valor del conjunto. */
  private normalize(value: number, all: number[]): number {
    const min = Math.min(...all);
    const max = Math.max(...all);
    return max > min ? (value - min) / (max - min) : 0;
  }

  /**
   * Proyecta un punto sobre la polilínea (punto más cercano sobre algún
   * segmento) usando un plano local equirectangular, suficiente a escala
   * urbana. Devuelve dónde subir/bajar y a qué altura del recorrido queda.
   */
  private projectOntoPath(
    query: LatLng,
    coords: LatLng[],
    cumulative: number[],
  ): PathProjection {
    const cosLat = Math.cos((query.lat * Math.PI) / 180);
    const metersPerDegree = 111_320;
    const toXY = (p: LatLng) => ({
      x: (p.lng - query.lng) * metersPerDegree * cosLat,
      y: (p.lat - query.lat) * metersPerDegree,
    });

    let best: PathProjection | null = null;

    for (let i = 0; i < coords.length - 1; i++) {
      const a = toXY(coords[i]);
      const b = toXY(coords[i + 1]);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;
      // El punto consultado es el origen (0,0) del plano local.
      const t =
        lengthSquared === 0
          ? 0
          : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));

      const px = a.x + t * dx;
      const py = a.y + t * dy;
      const distance = Math.hypot(px, py);

      if (!best || distance < best.walkDistance) {
        best = {
          point: {
            lat: coords[i].lat + t * (coords[i + 1].lat - coords[i].lat),
            lng: coords[i].lng + t * (coords[i + 1].lng - coords[i].lng),
          },
          walkDistance: distance,
          along: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
          segmentIndex: i,
        };
      }
    }

    // coords.length >= 2 está garantizado por el llamador.
    return best as PathProjection;
  }

  /** Distancia acumulada (m) desde el inicio hasta cada vértice de la polilínea. */
  private cumulativeDistances(coords: LatLng[]): number[] {
    const cumulative: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      cumulative.push(cumulative[i - 1] + this.haversine(coords[i - 1], coords[i]));
    }
    return cumulative;
  }

  private haversine(a: LatLng, b: LatLng): number {
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
