import { Inject, Injectable } from '@nestjs/common';
import type {
  LatLng,
  PlannerBadge,
  PlannerMetrics,
  PlannerMode,
  PlannerResponse,
  PlannerResult,
  RouteStep,
} from '@collectigo/shared';
import { RoutesService } from '../routes/routes.service';
import { WalkRoutingService, type WalkPath } from './walk-routing.service';
import { TrafficService } from './traffic.service';
import type { RouteEntity } from '../routes/entities/route.entity';
import type { RoutePathEntity } from '../routes/entities/route-path.entity';
import {
  DEFAULT_PLANNER_MODE,
  calculateGeneralizedCost,
  filterParetoOptimalRoutes,
  getPlannerMetrics,
  selectDiversifiedRoutes,
} from './planner-ranking';

const EARTH_RADIUS_METERS = 6_371_000;
const METERS_PER_DEGREE = 111_320;
const WALK_SPEED_METERS_PER_MIN = 80;
const VEHICLE_SPEED_METERS_PER_MIN = 300;

/** Espera promedio estimada cada vez que el pasajero aborda un vehículo. */
const WAIT_SECONDS = 240;
/** Tramos en vehículo menores a esto no tienen sentido (mejor caminar). */
const MIN_RIDE_METERS = 150;
/** Máxima caminata permitida entre el descenso de una ruta y la siguiente. */
const MAX_TRANSFER_WALK_METERS = 150;
/** Conexiones cercanas se agrupan para no evaluar el mismo cruce repetidamente. */
const TRANSFER_CLUSTER_METERS = 80;
const MAX_CONNECTIONS_PER_PATH_PAIR = 250;
/** Más allá de esta distancia no se ofrece ir caminando directo. */
const MAX_DIRECT_WALK_METERS = 2_500;
/** Caminata total máxima aceptada dentro de una opción con transporte. */
const MAX_TRANSIT_WALK_METERS = 2_000;
/** Cuántos candidatos de transporte se enriquecen con datos externos. */
const MAX_ENRICHED_CANDIDATES = 8;
const MAX_VARIANTS_PER_ROUTE_SEQUENCE = 2;
const MAX_ALTERNATIVES = 3;

/** Tramos tarifarios de las rutas TA/TAT. */
const TA_MID_FARE_FROM_METERS = 5_000;
const TA_HIGH_FARE_FROM_METERS = 6_000;

const VEHICLE_LABEL: Record<string, string> = {
  colectivo: 'colectivo',
  auto: 'auto',
  combi: 'combi',
  bus: 'bus',
};

interface PathProjection {
  point: LatLng;
  walkDistance: number;
  along: number;
  segmentIndex: number;
}

interface PathContext {
  route: RouteEntity;
  path: RoutePathEntity;
  coordinates: LatLng[];
  cumulative: number[];
  originProjection: PathProjection;
  destinationProjection: PathProjection;
}

interface RideLegCandidate {
  route: RouteEntity;
  path: RoutePathEntity;
  boardPoint: LatLng;
  alightPoint: LatLng;
  ridePath: LatLng[];
  rideDistance: number;
  fare: number;
}

interface TransferConnection {
  from: PathProjection;
  to: PathProjection;
  walkDistance: number;
}

interface TransferWalkCandidate {
  from: LatLng;
  to: LatLng;
  walkDistance: number;
}

interface TripCandidate {
  legs: RideLegCandidate[];
  transfers: TransferWalkCandidate[];
  walkToBoard: number;
  walkFromAlight: number;
  totalDistance: number;
  totalDurationSeconds: number;
  fare: number;
  metrics: PlannerMetrics;
}

interface TripOption {
  result: PlannerResult;
  isWalkOnly: boolean;
}

interface XY {
  x: number;
  y: number;
}

interface SegmentConnection {
  firstT: number;
  secondT: number;
  distance: number;
}

@Injectable()
export class PlannerService {
  private readonly transferConnectionsCache = new Map<
    string,
    TransferConnection[]
  >();

  constructor(
    @Inject(RoutesService)
    private readonly routesService: RoutesService,
    @Inject(WalkRoutingService)
    private readonly walkRouting: WalkRoutingService,
    @Inject(TrafficService)
    private readonly traffic: TrafficService,
  ) {}

  async calculate(
    origin: LatLng,
    destination: LatLng,
    mode: PlannerMode = DEFAULT_PLANNER_MODE,
  ): Promise<PlannerResponse> {
    const routes = await this.routesService.findAll();
    const candidates = this.buildCandidates(origin, destination, routes);
    const preselected = this.preselect(candidates, mode);

    const directWalkDistance = this.haversine(origin, destination);
    const includeWalkOnly = directWalkDistance <= MAX_DIRECT_WALK_METERS;

    const transitResults = await Promise.all(
      preselected.map((candidate) =>
        this.buildTransitResult(candidate, origin, destination),
      ),
    );

    const options: TripOption[] = transitResults
      .filter((result): result is PlannerResult => result !== null)
      .map((result) => ({ result, isWalkOnly: false }));

    if (includeWalkOnly) {
      const walkOnly = await this.buildWalkOnlyResult(
        origin,
        destination,
        directWalkDistance,
      );
      if (walkOnly) options.push({ result: walkOnly, isWalkOnly: true });
    }

    if (options.length === 0) {
      const empty: PlannerResult = {
        steps: [],
        totalDistance: 0,
        totalDuration: 0,
        totalFare: 0,
      };
      return { best: empty, alternatives: [] };
    }

    const paretoResults = filterParetoOptimalRoutes(
      options.map((option) => option.result),
    );
    const paretoOptions = paretoResults.map((result) => ({
      result,
      isWalkOnly: !result.steps.some((step) => step.type === 'ride'),
    }));
    this.assignBadges(paretoOptions);

    const selected = selectDiversifiedRoutes(
      paretoResults,
      mode,
      1 + MAX_ALTERNATIVES,
    );
    const best = selected[0];
    best.label = this.buildLabel({
      result: best,
      isWalkOnly: !best.steps.some((step) => step.type === 'ride'),
    });

    return {
      best,
      alternatives: selected.slice(1),
    };
  }

  /** Construye opciones directas y opciones con un único transbordo. */
  private buildCandidates(
    origin: LatLng,
    destination: LatLng,
    routes: RouteEntity[],
  ): TripCandidate[] {
    const contexts = this.buildPathContexts(origin, destination, routes);
    const directCandidates = contexts
      .map((context) => this.buildDirectCandidate(context))
      .filter((candidate): candidate is TripCandidate => candidate !== null);

    const transferCandidates: TripCandidate[] = [];
    for (const first of contexts) {
      for (const second of contexts) {
        if (first.route.id === second.route.id) continue;
        const candidate = this.buildTransferCandidate(first, second);
        if (candidate) transferCandidates.push(candidate);
      }
    }

    return [...directCandidates, ...transferCandidates].filter((candidate) =>
      this.isValidCandidate(candidate),
    );
  }

  private buildPathContexts(
    origin: LatLng,
    destination: LatLng,
    routes: RouteEntity[],
  ): PathContext[] {
    const contexts: PathContext[] = [];

    for (const route of routes) {
      for (const path of route.paths ?? []) {
        const coordinates = path.coordinates ?? [];
        if (coordinates.length < 2) continue;
        const cumulative = this.cumulativeDistances(coordinates);
        contexts.push({
          route,
          path,
          coordinates,
          cumulative,
          originProjection: this.projectOntoPath(
            origin,
            coordinates,
            cumulative,
          ),
          destinationProjection: this.projectOntoPath(
            destination,
            coordinates,
            cumulative,
          ),
        });
      }
    }

    return contexts;
  }

  private buildDirectCandidate(context: PathContext): TripCandidate | null {
    const { originProjection: board, destinationProjection: alight } = context;
    const rideDistance = alight.along - board.along;
    if (rideDistance < MIN_RIDE_METERS) return null;

    const leg = this.buildRideLeg(context, board, alight);
    return this.composeCandidate(
      [leg],
      [],
      board.walkDistance,
      alight.walkDistance,
    );
  }

  private buildTransferCandidate(
    first: PathContext,
    second: PathContext,
  ): TripCandidate | null {
    const connections = this.getTransferConnections(first, second);
    let best: TripCandidate | null = null;

    for (const connection of connections) {
      const firstRideDistance =
        connection.from.along - first.originProjection.along;
      const secondRideDistance =
        second.destinationProjection.along - connection.to.along;
      if (
        firstRideDistance < MIN_RIDE_METERS ||
        secondRideDistance < MIN_RIDE_METERS
      )
        continue;

      const firstLeg = this.buildRideLeg(
        first,
        first.originProjection,
        connection.from,
      );
      const secondLeg = this.buildRideLeg(
        second,
        connection.to,
        second.destinationProjection,
      );
      const candidate = this.composeCandidate(
        [firstLeg, secondLeg],
        [
          {
            from: connection.from.point,
            to: connection.to.point,
            walkDistance: connection.walkDistance,
          },
        ],
        first.originProjection.walkDistance,
        second.destinationProjection.walkDistance,
      );

      if (!best || candidate.totalDurationSeconds < best.totalDurationSeconds) {
        best = candidate;
      }
    }

    return best;
  }

  private buildRideLeg(
    context: PathContext,
    board: PathProjection,
    alight: PathProjection,
  ): RideLegCandidate {
    const rideDistance = alight.along - board.along;
    return {
      route: context.route,
      path: context.path,
      boardPoint: board.point,
      alightPoint: alight.point,
      ridePath: this.slicePath(context.coordinates, board, alight),
      rideDistance,
      fare: this.calculateFare(context.route, rideDistance),
    };
  }

  private composeCandidate(
    legs: RideLegCandidate[],
    transfers: TransferWalkCandidate[],
    walkToBoard: number,
    walkFromAlight: number,
  ): TripCandidate {
    const rideDistance = legs.reduce((sum, leg) => sum + leg.rideDistance, 0);
    const transferDistance = transfers.reduce(
      (sum, transfer) => sum + transfer.walkDistance,
      0,
    );
    const fare = legs.reduce((sum, leg) => sum + leg.fare, 0);
    const totalDistance =
      walkToBoard + rideDistance + transferDistance + walkFromAlight;
    const walkSeconds =
      ((walkToBoard + transferDistance + walkFromAlight) /
        WALK_SPEED_METERS_PER_MIN) *
      60;
    const rideSeconds = (rideDistance / VEHICLE_SPEED_METERS_PER_MIN) * 60;
    const metrics: PlannerMetrics = {
      vehicleMinutes: rideSeconds / 60,
      walkingMinutes: walkSeconds / 60,
      waitingMinutes: (WAIT_SECONDS * legs.length) / 60,
      walkingDistance: walkToBoard + transferDistance + walkFromAlight,
      transferCount: transfers.length,
    };

    return {
      legs,
      transfers,
      walkToBoard,
      walkFromAlight,
      totalDistance,
      totalDurationSeconds:
        walkSeconds + rideSeconds + WAIT_SECONDS * legs.length,
      fare: this.roundMoney(fare),
      metrics,
    };
  }

  private isValidCandidate(candidate: TripCandidate): boolean {
    return (
      [
        candidate.totalDistance,
        candidate.totalDurationSeconds,
        candidate.fare,
        candidate.metrics.vehicleMinutes,
        candidate.metrics.walkingMinutes,
        candidate.metrics.waitingMinutes,
        candidate.metrics.walkingDistance,
      ].every((value) => Number.isFinite(value) && value >= 0) &&
      candidate.metrics.walkingDistance <= MAX_TRANSIT_WALK_METERS
    );
  }

  /**
   * Conserva dos variantes por secuencia y preselecciona un conjunto diverso.
   * Así una estimación preliminar imprecisa no elimina todas las opciones que
   * podrían mejorar después de consultar OSRM o tráfico.
   */
  private preselect(
    candidates: TripCandidate[],
    mode: PlannerMode,
  ): TripCandidate[] {
    if (candidates.length === 0) return [];

    const cost = (candidate: TripCandidate, selectedMode = mode): number =>
      calculateGeneralizedCost(
        {
          totalDuration: candidate.totalDurationSeconds,
          totalFare: candidate.fare,
          totalDistance: candidate.totalDistance,
          metrics: candidate.metrics,
        },
        selectedMode,
      );
    const variantsPerSequence = new Map<string, TripCandidate[]>();
    for (const candidate of candidates) {
      const key = candidate.legs.map((leg) => leg.route.id).join('>');
      const variants = variantsPerSequence.get(key) ?? [];
      variants.push(candidate);
      variants.sort((first, second) => cost(first) - cost(second));
      variantsPerSequence.set(
        key,
        variants.slice(0, MAX_VARIANTS_PER_ROUTE_SEQUENCE),
      );
    }

    const pool = [...variantsPerSequence.values()].flat();
    const selected: TripCandidate[] = [];
    const add = (candidate: TripCandidate | undefined): void => {
      if (
        candidate &&
        !selected.includes(candidate) &&
        selected.length < MAX_ENRICHED_CANDIDATES
      ) {
        selected.push(candidate);
      }
    };
    const bestBy = (
      compare: (first: TripCandidate, second: TripCandidate) => number,
    ): TripCandidate | undefined => [...pool].sort(compare)[0];

    add(bestBy((first, second) => cost(first) - cost(second)));
    add(
      bestBy(
        (first, second) =>
          first.totalDurationSeconds - second.totalDurationSeconds,
      ),
    );
    add(bestBy((first, second) => first.fare - second.fare));
    add(
      bestBy(
        (first, second) =>
          first.metrics.walkingDistance - second.metrics.walkingDistance,
      ),
    );
    add(
      bestBy(
        (first, second) =>
          first.metrics.transferCount - second.metrics.transferCount,
      ),
    );
    add(
      bestBy(
        (first, second) =>
          cost(first, DEFAULT_PLANNER_MODE) -
          cost(second, DEFAULT_PLANNER_MODE),
      ),
    );
    for (const candidate of [...pool].sort(
      (first, second) => cost(first) - cost(second),
    )) {
      add(candidate);
    }

    return selected;
  }

  private async buildTransitResult(
    candidate: TripCandidate,
    origin: LatLng,
    destination: LatLng,
  ): Promise<PlannerResult | null> {
    const walkRequests = [
      this.walkRouting.getWalkPath(origin, candidate.legs[0].boardPoint),
      ...candidate.transfers.map((transfer) =>
        this.walkRouting.getWalkPath(transfer.from, transfer.to),
      ),
      this.walkRouting.getWalkPath(
        candidate.legs[candidate.legs.length - 1].alightPoint,
        destination,
      ),
    ];
    const trafficRequests = candidate.legs.map((leg) =>
      this.traffic.getRideDurationSeconds(leg.ridePath),
    );

    const [walkPaths, trafficDurations] = await Promise.all([
      Promise.all(walkRequests),
      Promise.all(trafficRequests),
    ]);

    const walkInPath = walkPaths[0];
    const walkOutPath = walkPaths[walkPaths.length - 1];
    const transferPaths = walkPaths.slice(1, -1);
    const transferDistances = candidate.transfers.map((transfer, index) =>
      this.safeNonNegative(
        transferPaths[index]?.distance,
        transfer.walkDistance,
      ),
    );

    if (
      transferDistances.some((distance) => distance > MAX_TRANSFER_WALK_METERS)
    ) {
      return null;
    }

    const walkInDistance = this.safeNonNegative(
      walkInPath?.distance,
      candidate.walkToBoard,
    );
    const walkOutDistance = this.safeNonNegative(
      walkOutPath?.distance,
      candidate.walkFromAlight,
    );
    const rideDurations = candidate.legs.map((leg, index) => {
      const speedFactor = this.safePositive(this.traffic.getSpeedFactor(), 1);
      const fallback =
        (leg.rideDistance / (VEHICLE_SPEED_METERS_PER_MIN * speedFactor)) * 60;
      return Math.round(this.safePositive(trafficDurations[index], fallback));
    });

    const steps: RouteStep[] = [
      this.buildWalkStep(
        origin,
        candidate.legs[0].boardPoint,
        walkInDistance,
        walkInPath,
        `Camina ${Math.round(walkInDistance)}m hasta el punto de subida de la ruta ${candidate.legs[0].route.name}`,
      ),
    ];

    candidate.legs.forEach((leg, index) => {
      steps.push(this.buildBoardStep(leg));
      steps.push(this.buildRideStep(leg, rideDurations[index]));

      const nextLeg = candidate.legs[index + 1];
      const transfer = candidate.transfers[index];
      if (nextLeg && transfer) {
        const distance = transferDistances[index];
        const path = transferPaths[index];
        steps.push({
          type: 'transfer',
          instruction:
            distance > 0
              ? `Baja de la ruta ${leg.route.name} y camina ${Math.round(distance)}m para transbordar a la ruta ${nextLeg.route.name}`
              : `Baja de la ruta ${leg.route.name} y transborda a la ruta ${nextLeg.route.name} en este punto`,
          distance: Math.round(distance),
          duration: Math.round((distance / WALK_SPEED_METERS_PER_MIN) * 60),
          routeId: nextLeg.route.id,
          routeName: nextLeg.route.name,
          routeColor: nextLeg.route.color,
          vehicleType: nextLeg.route.type,
          from: transfer.from,
          to: transfer.to,
          ...(path ? { path: path.path } : {}),
        });
      }
    });

    const lastLeg = candidate.legs[candidate.legs.length - 1];
    steps.push({
      type: 'arrive',
      instruction: `Baja del ${VEHICLE_LABEL[lastLeg.route.type] ?? 'vehículo'} y camina ${Math.round(walkOutDistance)}m hasta tu destino`,
      distance: Math.round(walkOutDistance),
      duration: Math.round((walkOutDistance / WALK_SPEED_METERS_PER_MIN) * 60),
      from: lastLeg.alightPoint,
      to: destination,
      ...(walkOutPath ? { path: walkOutPath.path } : {}),
    });

    const routeNames = candidate.legs.map((leg) => leg.route.name);
    const companyNames = this.uniqueLabels(
      candidate.legs.map((leg) => leg.route.fleet?.company?.name),
    );
    const fleetNumbers = this.uniqueLabels(
      candidate.legs.map((leg) => leg.route.fleet?.number),
    );
    const totalRideDistance = candidate.legs.reduce(
      (sum, leg) => sum + leg.rideDistance,
      0,
    );
    const totalTransferDistance = transferDistances.reduce(
      (sum, distance) => sum + distance,
      0,
    );

    const result: PlannerResult = {
      steps,
      totalDistance: Math.round(
        walkInDistance +
          totalRideDistance +
          totalTransferDistance +
          walkOutDistance,
      ),
      totalDuration: steps.reduce((sum, step) => sum + (step.duration ?? 0), 0),
      totalFare: candidate.fare,
      routeName: routeNames.join(' → '),
      ...(companyNames ? { companyName: companyNames } : {}),
      ...(fleetNumbers ? { fleetNumber: fleetNumbers } : {}),
      ...(candidate.legs.length === 1 &&
      candidate.legs[0].route.fleet?.vehicleImageUrl
        ? { vehicleImageUrl: candidate.legs[0].route.fleet.vehicleImageUrl }
        : {}),
      transferCount: candidate.transfers.length,
    };
    result.metrics = getPlannerMetrics(result);
    if (result.metrics.walkingDistance > MAX_TRANSIT_WALK_METERS) return null;
    return result;
  }

  private buildWalkStep(
    from: LatLng,
    to: LatLng,
    distance: number,
    walkPath: WalkPath | null,
    instruction: string,
  ): RouteStep {
    return {
      type: 'walk',
      instruction,
      distance: Math.round(distance),
      duration: Math.round((distance / WALK_SPEED_METERS_PER_MIN) * 60),
      from,
      to,
      ...(walkPath ? { path: walkPath.path } : {}),
    };
  }

  private buildBoardStep(leg: RideLegCandidate): RouteStep {
    const company = leg.route.fleet?.company;
    const fleetNumber = leg.route.fleet?.number;
    const vehicleLabel = VEHICLE_LABEL[leg.route.type] ?? 'vehículo';
    const companyLabel = company ? ` de ${company.name}` : '';
    const fleetLabel = fleetNumber ? ` (flota ${fleetNumber})` : '';

    return {
      type: 'board',
      instruction: `Sube al ${vehicleLabel} ${leg.route.name}${companyLabel}${fleetLabel} — tarifa estimada S/ ${leg.fare.toFixed(2)} y espera aprox. ${Math.round(WAIT_SECONDS / 60)} min`,
      duration: WAIT_SECONDS,
      fare: leg.fare,
      routeId: leg.route.id,
      routeName: leg.route.name,
      routeColor: leg.route.color,
      vehicleType: leg.route.type,
    };
  }

  private buildRideStep(leg: RideLegCandidate, duration: number): RouteStep {
    const variantSuffix = leg.path.variantName
      ? ` (${leg.path.variantName})`
      : '';
    return {
      type: 'ride',
      instruction: `Viaja por la ruta ${leg.route.name}${variantSuffix} hasta el punto de bajada`,
      distance: Math.round(leg.rideDistance),
      duration,
      routeId: leg.route.id,
      routeName: leg.route.name,
      routeColor: leg.route.color,
      vehicleType: leg.route.type,
      from: leg.boardPoint,
      to: leg.alightPoint,
      path: leg.ridePath,
    };
  }

  private async buildWalkOnlyResult(
    origin: LatLng,
    destination: LatLng,
    directDistance: number,
  ): Promise<PlannerResult | null> {
    const walkPath = await this.walkRouting.getWalkPath(origin, destination);
    const distance = this.safeNonNegative(walkPath?.distance, directDistance);
    if (distance > MAX_DIRECT_WALK_METERS) return null;
    const duration = Math.round((distance / WALK_SPEED_METERS_PER_MIN) * 60);

    const result: PlannerResult = {
      steps: [
        {
          type: 'walk',
          instruction: `Camina ${Math.round(distance)}m hasta tu destino`,
          distance: Math.round(distance),
          duration,
          from: origin,
          to: destination,
          ...(walkPath ? { path: walkPath.path } : {}),
        },
      ],
      totalDistance: Math.round(distance),
      totalDuration: duration,
      totalFare: 0,
      routeName: 'A pie',
      transferCount: 0,
    };
    result.metrics = getPlannerMetrics(result);
    return result;
  }

  private calculateFare(route: RouteEntity, rideDistance: number): number {
    const baseFare = Number(route.fare);
    if (!Number.isFinite(baseFare) || baseFare < 0) return Number.NaN;
    const prefix = route.name.trim().toUpperCase().split(/[-\s]/)[0];
    if (prefix !== 'TA' && prefix !== 'TAT') return this.roundMoney(baseFare);
    if (rideDistance > TA_HIGH_FARE_FROM_METERS)
      return this.roundMoney(baseFare + 1);
    if (rideDistance > TA_MID_FARE_FROM_METERS)
      return this.roundMoney(baseFare + 0.5);
    return this.roundMoney(baseFare);
  }

  private getTransferConnections(
    first: PathContext,
    second: PathContext,
  ): TransferConnection[] {
    const firstKey = `${first.route.id}:${first.path.id}`;
    const secondKey = `${second.route.id}:${second.path.id}`;
    const key = `${firstKey}>${secondKey}`;
    const cached = this.transferConnectionsCache.get(key);
    if (cached) return cached;

    const reverseKey = `${secondKey}>${firstKey}`;
    const reverseCached = this.transferConnectionsCache.get(reverseKey);
    if (reverseCached) {
      const reversed = reverseCached.map((connection) => ({
        from: connection.to,
        to: connection.from,
        walkDistance: connection.walkDistance,
      }));
      this.transferConnectionsCache.set(key, reversed);
      return reversed;
    }

    const raw: TransferConnection[] = [];
    for (
      let firstIndex = 0;
      firstIndex < first.coordinates.length - 1;
      firstIndex++
    ) {
      for (
        let secondIndex = 0;
        secondIndex < second.coordinates.length - 1;
        secondIndex++
      ) {
        const closest = this.closestSegmentConnection(
          first.coordinates[firstIndex],
          first.coordinates[firstIndex + 1],
          second.coordinates[secondIndex],
          second.coordinates[secondIndex + 1],
        );
        if (closest.distance > MAX_TRANSFER_WALK_METERS) continue;

        raw.push({
          from: this.positionOnSegment(first, firstIndex, closest.firstT),
          to: this.positionOnSegment(second, secondIndex, closest.secondT),
          walkDistance: closest.distance,
        });
      }
    }

    const clustered: TransferConnection[] = [];
    for (const connection of raw.sort((a, b) => a.from.along - b.from.along)) {
      const duplicate = clustered.some(
        (current) =>
          Math.abs(current.from.along - connection.from.along) <
            TRANSFER_CLUSTER_METERS &&
          Math.abs(current.to.along - connection.to.along) <
            TRANSFER_CLUSTER_METERS,
      );
      if (!duplicate) clustered.push(connection);
      if (clustered.length >= MAX_CONNECTIONS_PER_PATH_PAIR) break;
    }

    this.transferConnectionsCache.set(key, clustered);
    return clustered;
  }

  private closestSegmentConnection(
    firstStart: LatLng,
    firstEnd: LatLng,
    secondStart: LatLng,
    secondEnd: LatLng,
  ): SegmentConnection {
    const referenceLat =
      (firstStart.lat + firstEnd.lat + secondStart.lat + secondEnd.lat) / 4;
    const cosLat = Math.cos((referenceLat * Math.PI) / 180);
    const toXY = (point: LatLng): XY => ({
      x: point.lng * METERS_PER_DEGREE * cosLat,
      y: point.lat * METERS_PER_DEGREE,
    });
    const a = toXY(firstStart);
    const b = toXY(firstEnd);
    const c = toXY(secondStart);
    const d = toXY(secondEnd);

    const intersection = this.segmentIntersection(a, b, c, d);
    if (intersection) {
      return {
        firstT: intersection.firstT,
        secondT: intersection.secondT,
        distance: 0,
      };
    }

    const firstStartProjection = this.projectXYOntoSegment(a, c, d);
    const firstEndProjection = this.projectXYOntoSegment(b, c, d);
    const secondStartProjection = this.projectXYOntoSegment(c, a, b);
    const secondEndProjection = this.projectXYOntoSegment(d, a, b);
    const candidates: SegmentConnection[] = [
      {
        firstT: 0,
        secondT: firstStartProjection.t,
        distance: firstStartProjection.distance,
      },
      {
        firstT: 1,
        secondT: firstEndProjection.t,
        distance: firstEndProjection.distance,
      },
      {
        firstT: secondStartProjection.t,
        secondT: 0,
        distance: secondStartProjection.distance,
      },
      {
        firstT: secondEndProjection.t,
        secondT: 1,
        distance: secondEndProjection.distance,
      },
    ];

    return candidates.reduce((best, candidate) =>
      candidate.distance < best.distance ? candidate : best,
    );
  }

  private projectXYOntoSegment(
    point: XY,
    start: XY,
    end: XY,
  ): { t: number; distance: number } {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point.x - start.x) * dx + (point.y - start.y) * dy) /
                lengthSquared,
            ),
          );
    const projectedX = start.x + t * dx;
    const projectedY = start.y + t * dy;
    return {
      t,
      distance: Math.hypot(point.x - projectedX, point.y - projectedY),
    };
  }

  private segmentIntersection(
    a: XY,
    b: XY,
    c: XY,
    d: XY,
  ): { firstT: number; secondT: number } | null {
    const firstDx = b.x - a.x;
    const firstDy = b.y - a.y;
    const secondDx = d.x - c.x;
    const secondDy = d.y - c.y;
    const denominator = firstDx * secondDy - firstDy * secondDx;
    if (Math.abs(denominator) < 1e-9) return null;

    const deltaX = c.x - a.x;
    const deltaY = c.y - a.y;
    const firstT = (deltaX * secondDy - deltaY * secondDx) / denominator;
    const secondT = (deltaX * firstDy - deltaY * firstDx) / denominator;
    if (firstT < 0 || firstT > 1 || secondT < 0 || secondT > 1) return null;
    return { firstT, secondT };
  }

  private positionOnSegment(
    context: PathContext,
    segmentIndex: number,
    t: number,
  ): PathProjection {
    const start = context.coordinates[segmentIndex];
    const end = context.coordinates[segmentIndex + 1];
    return {
      point: this.interpolate(start, end, t),
      walkDistance: 0,
      along:
        context.cumulative[segmentIndex] +
        t *
          (context.cumulative[segmentIndex + 1] -
            context.cumulative[segmentIndex]),
      segmentIndex,
    };
  }

  private slicePath(
    coordinates: LatLng[],
    from: PathProjection,
    to: PathProjection,
  ): LatLng[] {
    return [
      from.point,
      ...coordinates.slice(from.segmentIndex + 1, to.segmentIndex + 1),
      to.point,
    ];
  }

  private interpolate(start: LatLng, end: LatLng, t: number): LatLng {
    return {
      lat: start.lat + t * (end.lat - start.lat),
      lng: start.lng + t * (end.lng - start.lng),
    };
  }

  private uniqueLabels(values: Array<string | undefined>): string {
    return [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ].join(' → ');
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private safeNonNegative(
    value: number | null | undefined,
    fallback: number,
  ): number {
    return Number.isFinite(value) && Number(value) >= 0
      ? Number(value)
      : fallback;
  }

  private safePositive(
    value: number | null | undefined,
    fallback: number,
  ): number {
    return Number.isFinite(value) && Number(value) > 0
      ? Number(value)
      : fallback;
  }

  private assignBadges(options: TripOption[]): void {
    const minDuration = Math.min(
      ...options.map((option) => option.result.totalDuration),
    );
    const minDistance = Math.min(
      ...options.map((option) => option.result.totalDistance),
    );
    const transitFares = options
      .filter((option) => !option.isWalkOnly)
      .map((option) => option.result.totalFare);
    const minFare = transitFares.length > 0 ? Math.min(...transitFares) : null;
    const minWalkingDistance = Math.min(
      ...options.map(
        (option) => getPlannerMetrics(option.result).walkingDistance,
      ),
    );
    const minTransfers = Math.min(
      ...options
        .filter((option) => !option.isWalkOnly)
        .map((option) => getPlannerMetrics(option.result).transferCount),
    );

    for (const option of options) {
      const badges: PlannerBadge[] = [];
      if (option.isWalkOnly) badges.push('walk_only');
      if (option.result.totalDuration === minDuration) badges.push('fastest');
      if (
        !option.isWalkOnly &&
        minFare !== null &&
        option.result.totalFare === minFare
      ) {
        badges.push('cheapest');
      }
      if (option.result.totalDistance === minDistance) badges.push('shortest');
      if (
        getPlannerMetrics(option.result).walkingDistance === minWalkingDistance
      ) {
        badges.push('less_walking');
      }
      if (
        !option.isWalkOnly &&
        getPlannerMetrics(option.result).transferCount === minTransfers
      ) {
        badges.push('fewer_transfers');
      }
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
    if (badges.includes('less_walking'))
      return 'La que requiere menos caminata';
    if (badges.includes('fewer_transfers'))
      return 'La que requiere menos transbordos';
    if (badges.includes('shortest')) return 'La de menor distancia';
    return 'La opción más equilibrada';
  }

  private projectOntoPath(
    query: LatLng,
    coordinates: LatLng[],
    cumulative: number[],
  ): PathProjection {
    const cosLat = Math.cos((query.lat * Math.PI) / 180);
    const toXY = (point: LatLng): XY => ({
      x: (point.lng - query.lng) * METERS_PER_DEGREE * cosLat,
      y: (point.lat - query.lat) * METERS_PER_DEGREE,
    });
    let best: PathProjection | null = null;

    for (let index = 0; index < coordinates.length - 1; index++) {
      const start = toXY(coordinates[index]);
      const end = toXY(coordinates[index + 1]);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const t =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, -(start.x * dx + start.y * dy) / lengthSquared),
            );
      const distance = Math.hypot(start.x + t * dx, start.y + t * dy);

      if (!best || distance < best.walkDistance) {
        best = {
          point: this.interpolate(
            coordinates[index],
            coordinates[index + 1],
            t,
          ),
          walkDistance: distance,
          along:
            cumulative[index] + t * (cumulative[index + 1] - cumulative[index]),
          segmentIndex: index,
        };
      }
    }

    return best as PathProjection;
  }

  private cumulativeDistances(coordinates: LatLng[]): number[] {
    const cumulative: number[] = [0];
    for (let index = 1; index < coordinates.length; index++) {
      cumulative.push(
        cumulative[index - 1] +
          this.haversine(coordinates[index - 1], coordinates[index]),
      );
    }
    return cumulative;
  }

  private haversine(a: LatLng, b: LatLng): number {
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
