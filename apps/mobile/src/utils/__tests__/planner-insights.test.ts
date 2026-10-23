import type { PlannerResult, RouteStep } from '@collectigo/shared';
import {
  getDurationComparisonMessage,
  getTrafficImpactMessage,
} from '../planner-insights';

function result(totalDuration: number, steps: RouteStep[] = []): PlannerResult {
  return {
    steps,
    totalDistance: 1_000,
    totalDuration,
    totalFare: 2,
  };
}

describe('getDurationComparisonMessage', () => {
  it('compara la opción más rápida con la más lenta', () => {
    const selected = result(600);

    expect(getDurationComparisonMessage(selected, [selected, result(1_020)])).toBe(
      '7 min más rápida que la opción más lenta',
    );
  });

  it('compara una opción más lenta con la más rápida', () => {
    const selected = result(900);

    expect(getDurationComparisonMessage(selected, [result(600), selected])).toBe(
      '5 min más lenta que la opción más rápida',
    );
  });

  it('indica que los tiempos son similares cuando difieren menos de un minuto', () => {
    const selected = result(600);

    expect(getDurationComparisonMessage(selected, [selected, result(645)])).toBe(
      'Tiempo similar a otras opciones',
    );
  });

  it('no compara cuando solo existe una opción', () => {
    const selected = result(600);

    expect(getDurationComparisonMessage(selected, [selected])).toBeNull();
  });
});

describe('getTrafficImpactMessage', () => {
  const googleRide = (duration: number, durationWithoutTraffic: number): RouteStep => ({
    type: 'ride',
    instruction: 'Viaja en la ruta',
    duration,
    durationWithoutTraffic,
    timeSource: 'GOOGLE_TRAFFIC',
  });

  it('suma el impacto cuando todos los tramos tienen datos completos de Google', () => {
    expect(
      getTrafficImpactMessage(result(1_800, [googleRide(600, 480), googleRide(720, 540)])),
    ).toBe(
      'Google estima aproximadamente 5 min adicionales frente a la duración sin tráfico actual.',
    );
  });

  it('omite el impacto si algún tramo usa una estimación local', () => {
    expect(
      getTrafficImpactMessage(
        result(1_800, [
          googleRide(600, 480),
          {
            type: 'ride',
            instruction: 'Viaja en la ruta',
            duration: 720,
            timeSource: 'LOCAL_ESTIMATE',
          },
        ]),
      ),
    ).toBeNull();
  });

  it('omite el impacto si falta la duración estática', () => {
    expect(
      getTrafficImpactMessage(
        result(900, [
          {
            type: 'ride',
            instruction: 'Viaja en la ruta',
            duration: 720,
            timeSource: 'GOOGLE_TRAFFIC',
          },
        ]),
      ),
    ).toBeNull();
  });

  it('omite diferencias positivas menores a un minuto', () => {
    expect(getTrafficImpactMessage(result(900, [googleRide(630, 600)]))).toBeNull();
  });
});
