import type {
  PlannerMetrics,
  PlannerMode,
  PlannerResult,
  RouteStep,
} from '@collectigo/shared';

export interface PlannerWeights {
  vehicleWeight: number;
  walkingWeight: number;
  waitingWeight: number;
  transferPenaltyMinutes: number;
  moneyToMinutes: number;
}

export const DEFAULT_PLANNER_MODE: PlannerMode = 'balanced';

/**
 * Parámetros centralizados y expresados en minutos equivalentes. Son valores
 * iniciales para calibrar posteriormente con viajes y elecciones reales.
 */
export const PLANNER_MODE_WEIGHTS: Record<PlannerMode, PlannerWeights> = {
  balanced: {
    vehicleWeight: 1,
    walkingWeight: 1.6,
    waitingWeight: 1.8,
    transferPenaltyMinutes: 7,
    moneyToMinutes: 4,
  },
  fastest: {
    vehicleWeight: 1,
    walkingWeight: 1.25,
    waitingWeight: 1.5,
    transferPenaltyMinutes: 3,
    moneyToMinutes: 1,
  },
  cheapest: {
    vehicleWeight: 1,
    walkingWeight: 1.4,
    waitingWeight: 1.6,
    transferPenaltyMinutes: 4,
    moneyToMinutes: 10,
  },
  less_walking: {
    vehicleWeight: 1,
    walkingWeight: 2.6,
    waitingWeight: 1.7,
    transferPenaltyMinutes: 6,
    moneyToMinutes: 3,
  },
  fewer_transfers: {
    vehicleWeight: 1,
    walkingWeight: 1.5,
    waitingWeight: 1.7,
    transferPenaltyMinutes: 20,
    moneyToMinutes: 3,
  },
  /** Compatibilidad con clientes anteriores. */
  shortest: {
    vehicleWeight: 1,
    walkingWeight: 2.6,
    waitingWeight: 1.7,
    transferPenaltyMinutes: 6,
    moneyToMinutes: 3,
  },
};

const WALKING_BANDS = [
  { meters: 500, multiplier: 1 },
  { meters: 500, multiplier: 1.15 },
  { meters: 1_000, multiplier: 1.35 },
  { meters: Number.POSITIVE_INFINITY, multiplier: 1.75 },
] as const;

const PARETO_TIME_EPSILON_SECONDS = 1;
const PARETO_FARE_EPSILON = 0.01;
const PARETO_WALK_EPSILON_METERS = 1;

export interface RankableJourney {
  totalDuration: number;
  totalFare: number;
  totalDistance: number;
  metrics: PlannerMetrics;
}

function finiteNonNegative(
  value: number | null | undefined,
  fallback = 0,
): number {
  return Number.isFinite(value) && Number(value) >= 0
    ? Number(value)
    : fallback;
}

function sumStepDuration(
  steps: RouteStep[],
  types: RouteStep['type'][],
): number {
  return steps
    .filter((step) => types.includes(step.type))
    .reduce((sum, step) => sum + finiteNonNegative(step.duration), 0);
}

/** Obtiene métricas incluso para respuestas antiguas que todavía no las incluyen. */
export function getPlannerMetrics(result: PlannerResult): PlannerMetrics {
  if (result.metrics) {
    return {
      vehicleMinutes: finiteNonNegative(result.metrics.vehicleMinutes),
      walkingMinutes: finiteNonNegative(result.metrics.walkingMinutes),
      waitingMinutes: finiteNonNegative(result.metrics.waitingMinutes),
      walkingDistance: finiteNonNegative(result.metrics.walkingDistance),
      transferCount: Math.max(
        0,
        Math.trunc(finiteNonNegative(result.metrics.transferCount)),
      ),
    };
  }

  const walkingTypes: RouteStep['type'][] = ['walk', 'transfer', 'arrive'];
  return {
    vehicleMinutes: sumStepDuration(result.steps, ['ride']) / 60,
    walkingMinutes: sumStepDuration(result.steps, walkingTypes) / 60,
    waitingMinutes: sumStepDuration(result.steps, ['board']) / 60,
    walkingDistance: result.steps
      .filter((step) => walkingTypes.includes(step.type))
      .reduce((sum, step) => sum + finiteNonNegative(step.distance), 0),
    transferCount: Math.max(
      0,
      Math.trunc(
        finiteNonNegative(
          result.transferCount,
          result.steps.filter((step) => step.type === 'transfer').length,
        ),
      ),
    ),
  };
}

/** Penaliza progresivamente cada banda adicional de caminata. */
export function calculateWalkingPenalty(
  walkingMinutes: number,
  walkingDistance: number,
  walkingWeight: number,
): number {
  const minutes = finiteNonNegative(walkingMinutes);
  const distance = finiteNonNegative(walkingDistance);
  if (minutes === 0) return 0;
  if (distance === 0) return minutes * walkingWeight;

  const minutesPerMeter = minutes / distance;
  let remaining = distance;
  let penalty = 0;

  for (const band of WALKING_BANDS) {
    if (remaining <= 0) break;
    const bandDistance = Math.min(remaining, band.meters);
    penalty += bandDistance * minutesPerMeter * walkingWeight * band.multiplier;
    remaining -= bandDistance;
  }

  return penalty;
}

export function calculateGeneralizedCost(
  journey: RankableJourney,
  mode: PlannerMode = DEFAULT_PLANNER_MODE,
): number {
  const weights =
    PLANNER_MODE_WEIGHTS[mode] ?? PLANNER_MODE_WEIGHTS[DEFAULT_PLANNER_MODE];
  const metrics = journey.metrics;
  const cost =
    finiteNonNegative(metrics.vehicleMinutes) * weights.vehicleWeight +
    calculateWalkingPenalty(
      metrics.walkingMinutes,
      metrics.walkingDistance,
      weights.walkingWeight,
    ) +
    finiteNonNegative(metrics.waitingMinutes) * weights.waitingWeight +
    finiteNonNegative(metrics.transferCount) * weights.transferPenaltyMinutes +
    finiteNonNegative(journey.totalFare, 1_000_000) * weights.moneyToMinutes;

  return Math.round(cost * 1000) / 1000;
}

export function isDominated(
  candidate: RankableJourney,
  other: RankableJourney,
): boolean {
  const candidateMetrics = candidate.metrics;
  const otherMetrics = other.metrics;
  const noWorse =
    other.totalDuration <=
      candidate.totalDuration + PARETO_TIME_EPSILON_SECONDS &&
    other.totalFare <= candidate.totalFare + PARETO_FARE_EPSILON &&
    otherMetrics.walkingDistance <=
      candidateMetrics.walkingDistance + PARETO_WALK_EPSILON_METERS &&
    otherMetrics.transferCount <= candidateMetrics.transferCount;
  const strictlyBetter =
    other.totalDuration <
      candidate.totalDuration - PARETO_TIME_EPSILON_SECONDS ||
    other.totalFare < candidate.totalFare - PARETO_FARE_EPSILON ||
    otherMetrics.walkingDistance <
      candidateMetrics.walkingDistance - PARETO_WALK_EPSILON_METERS ||
    otherMetrics.transferCount < candidateMetrics.transferCount;

  return noWorse && strictlyBetter;
}

export function filterParetoOptimalRoutes(
  results: PlannerResult[],
): PlannerResult[] {
  const journeys = results.map((result) => ({
    result,
    rankable: { ...result, metrics: getPlannerMetrics(result) },
  }));
  return journeys
    .filter(
      (candidate, candidateIndex) =>
        !journeys.some(
          (other, otherIndex) =>
            candidateIndex !== otherIndex &&
            isDominated(candidate.rankable, other.rankable),
        ),
    )
    .map(({ result }) => result);
}

function routeSequence(result: PlannerResult): string {
  const rides = result.steps.filter((step) => step.type === 'ride');
  if (rides.length === 0) return 'walk_only';
  return rides
    .map((step) => step.routeId ?? step.routeName ?? 'unknown')
    .join('>');
}

function arePracticallyEquivalent(
  first: PlannerResult,
  second: PlannerResult,
): boolean {
  const firstMetrics = getPlannerMetrics(first);
  const secondMetrics = getPlannerMetrics(second);
  return (
    routeSequence(first) === routeSequence(second) &&
    firstMetrics.transferCount === secondMetrics.transferCount &&
    Math.abs(first.totalDuration - second.totalDuration) <= 60 &&
    Math.abs(first.totalFare - second.totalFare) <= 0.01 &&
    Math.abs(firstMetrics.walkingDistance - secondMetrics.walkingDistance) <=
      100
  );
}

function compareNumber(first: number, second: number): number {
  return first - second;
}

function compareGeneralizedCost(
  first: PlannerResult,
  second: PlannerResult,
): number {
  return (
    compareNumber(
      first.generalizedCost ?? Number.POSITIVE_INFINITY,
      second.generalizedCost ?? Number.POSITIVE_INFINITY,
    ) ||
    compareNumber(first.totalDuration, second.totalDuration) ||
    compareNumber(first.totalFare, second.totalFare) ||
    (first.routeName ?? '').localeCompare(second.routeName ?? '')
  );
}

/** Recomendada + alternativas representativas, evitando variantes casi idénticas. */
export function selectDiversifiedRoutes(
  results: PlannerResult[],
  mode: PlannerMode = DEFAULT_PLANNER_MODE,
  limit = 4,
): PlannerResult[] {
  if (limit <= 0 || results.length === 0) return [];

  for (const result of results) {
    result.metrics = getPlannerMetrics(result);
    result.generalizedCost = calculateGeneralizedCost(
      { ...result, metrics: result.metrics },
      mode,
    );
    result.score = result.generalizedCost;
  }

  const byGeneralizedCost = [...results].sort(compareGeneralizedCost);
  const selected: PlannerResult[] = [];
  const add = (candidate: PlannerResult | undefined): void => {
    if (!candidate || selected.length >= limit) return;
    if (
      selected.some((current) => arePracticallyEquivalent(current, candidate))
    )
      return;
    selected.push(candidate);
  };
  const bestBy = (
    compare: (first: PlannerResult, second: PlannerResult) => number,
  ): PlannerResult | undefined =>
    [...results].sort(
      (first, second) =>
        compare(first, second) || compareGeneralizedCost(first, second),
    )[0];

  add(byGeneralizedCost[0]);
  add(
    bestBy((first, second) =>
      compareNumber(first.totalDuration, second.totalDuration),
    ),
  );
  add(
    bestBy((first, second) => compareNumber(first.totalFare, second.totalFare)),
  );
  add(
    bestBy((first, second) =>
      compareNumber(
        getPlannerMetrics(first).walkingDistance,
        getPlannerMetrics(second).walkingDistance,
      ),
    ),
  );
  add(
    bestBy((first, second) =>
      compareNumber(
        getPlannerMetrics(first).transferCount,
        getPlannerMetrics(second).transferCount,
      ),
    ),
  );
  for (const candidate of byGeneralizedCost) add(candidate);

  return selected;
}

/** Implementación anterior conservada únicamente para pruebas comparativas. */
export function calculateLegacyScores(
  results: Array<
    Pick<RankableJourney, 'totalDuration' | 'totalFare' | 'totalDistance'>
  >,
): number[] {
  const normalize = (value: number, values: number[]): number => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return max > min ? (value - min) / (max - min) : 0;
  };
  const durations = results.map((result) => result.totalDuration);
  const fares = results.map((result) => result.totalFare);
  const distances = results.map((result) => result.totalDistance);
  return results.map(
    (result) =>
      0.5 * normalize(result.totalDuration, durations) +
      0.3 * normalize(result.totalFare, fares) +
      0.2 * normalize(result.totalDistance, distances),
  );
}
