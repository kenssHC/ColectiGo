import type { PlannerResult } from '@collectigo/shared';

function roundedMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function isValidDuration(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0;
}

export function getDurationComparisonMessage(
  selected: PlannerResult,
  options: PlannerResult[],
): string | null {
  if (options.length < 2 || !isValidDuration(selected.totalDuration)) return null;

  const durations = options
    .map((option) => option.totalDuration)
    .filter((duration) => isValidDuration(duration));
  if (durations.length < 2) return null;

  const fastest = Math.min(...durations);
  const slowest = Math.max(...durations);
  const slowerThanFastest = selected.totalDuration - fastest;
  const fasterThanSlowest = slowest - selected.totalDuration;

  if (slowerThanFastest >= 60) {
    return `${roundedMinutes(slowerThanFastest)} min más lenta que la opción más rápida`;
  }
  if (fasterThanSlowest >= 60) {
    return `${roundedMinutes(fasterThanSlowest)} min más rápida que la opción más lenta`;
  }
  return 'Tiempo similar a otras opciones';
}

export function getTrafficImpactMessage(result: PlannerResult): string | null {
  const rideSteps = result.steps.filter((step) => step.type === 'ride');
  if (rideSteps.length === 0) return null;

  const hasCompleteGoogleTrafficData = rideSteps.every(
    (step) =>
      step.timeSource === 'GOOGLE_TRAFFIC' &&
      isValidDuration(step.duration) &&
      isValidDuration(step.durationWithoutTraffic),
  );
  if (!hasCompleteGoogleTrafficData) return null;

  const additionalSeconds = rideSteps.reduce(
    (total, step) => total + step.duration! - step.durationWithoutTraffic!,
    0,
  );
  if (additionalSeconds < 60) return null;

  return `Google estima aproximadamente ${roundedMinutes(additionalSeconds)} min adicionales frente a la duración sin tráfico actual.`;
}
