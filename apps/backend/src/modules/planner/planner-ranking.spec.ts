import type { PlannerMetrics, PlannerResult } from '@collectigo/shared';
import {
  calculateGeneralizedCost,
  calculateLegacyScores,
  calculateWalkingPenalty,
  filterParetoOptimalRoutes,
  getPlannerMetrics,
  selectDiversifiedRoutes,
} from './planner-ranking';

function metrics(overrides: Partial<PlannerMetrics> = {}): PlannerMetrics {
  return {
    vehicleMinutes: 20,
    walkingMinutes: 2,
    waitingMinutes: 4,
    walkingDistance: 160,
    transferCount: 0,
    ...overrides,
  };
}

function result(
  routeName: string,
  plannerMetrics: PlannerMetrics,
  totalFare: number,
  totalDistance = 5_000,
): PlannerResult {
  const rideSteps = Array.from(
    { length: plannerMetrics.transferCount + 1 },
    (_, index) => ({
      type: 'ride' as const,
      instruction: `Viaja en ${routeName}-${index + 1}`,
      routeId: `${routeName}-${index + 1}`,
      routeName: `${routeName}-${index + 1}`,
    }),
  );
  return {
    steps: rideSteps,
    totalDistance,
    totalDuration:
      (plannerMetrics.vehicleMinutes +
        plannerMetrics.walkingMinutes +
        plannerMetrics.waitingMinutes) *
      60,
    totalFare,
    routeName,
    transferCount: plannerMetrics.transferCount,
    metrics: plannerMetrics,
  };
}

describe('planner ranking', () => {
  it('elimina una ruta completamente dominada mediante Pareto', () => {
    const better = result('A', metrics(), 2);
    const dominated = result(
      'B',
      metrics({
        vehicleMinutes: 25,
        walkingMinutes: 4,
        walkingDistance: 320,
        transferCount: 1,
      }),
      3,
    );

    expect(filterParetoOptimalRoutes([dominated, better])).toEqual([better]);
  });

  it('conserva alternativas con compromisos reales entre tiempo y precio', () => {
    const fastExpensive = result('Rápida', metrics({ vehicleMinutes: 10 }), 10);
    const slowCheap = result('Barata', metrics({ vehicleMinutes: 20 }), 1);

    expect(filterParetoOptimalRoutes([fastExpensive, slowCheap])).toHaveLength(
      2,
    );
  });

  it('penaliza progresivamente las caminatas largas', () => {
    const short = calculateWalkingPenalty(10, 500, 1.6);
    const long = calculateWalkingPenalty(20, 1_000, 1.6);

    expect(long).toBeGreaterThan(short * 2);
  });

  it('evita que una opción barata con caminata excesiva venza por costo cero', () => {
    const longWalk = result(
      'A pie',
      metrics({
        vehicleMinutes: 0,
        walkingMinutes: 30,
        waitingMinutes: 0,
        walkingDistance: 2_000,
      }),
      0,
      2_000,
    );
    longWalk.steps = [
      { type: 'walk', instruction: 'Camina', duration: 1_800, distance: 2_000 },
    ];
    const transit = result('Directa', metrics({ vehicleMinutes: 20 }), 2);

    expect(selectDiversifiedRoutes([longWalk, transit], 'balanced', 1)[0]).toBe(
      transit,
    );
  });

  it('prefiere una directa si el ahorro pequeño no compensa un transbordo', () => {
    const direct = result('Directa', metrics({ vehicleMinutes: 25 }), 2);
    const transfer = result(
      'Transbordo',
      metrics({ vehicleMinutes: 22, waitingMinutes: 8, transferCount: 1 }),
      4,
    );

    expect(selectDiversifiedRoutes([transfer, direct], 'balanced', 1)[0]).toBe(
      direct,
    );
  });

  it('cambia coherentemente entre balanced, fastest y cheapest', () => {
    const fastExpensive = result(
      'Rápida',
      metrics({ vehicleMinutes: 10, walkingMinutes: 0 }),
      10,
    );
    const slowCheap = result(
      'Barata',
      metrics({ vehicleMinutes: 20, walkingMinutes: 0 }),
      1,
    );

    expect(
      selectDiversifiedRoutes([fastExpensive, slowCheap], 'balanced', 1)[0],
    ).toBe(slowCheap);
    expect(
      selectDiversifiedRoutes([fastExpensive, slowCheap], 'fastest', 1)[0],
    ).toBe(fastExpensive);
    expect(
      selectDiversifiedRoutes([fastExpensive, slowCheap], 'cheapest', 1)[0],
    ).toBe(slowCheap);
  });

  it('less_walking y fewer_transfers aplican preferencias distintas', () => {
    const moreWalking = result(
      'Más caminata',
      metrics({ vehicleMinutes: 10, walkingMinutes: 10, walkingDistance: 500 }),
      2,
    );
    const lessWalking = result(
      'Menos caminata',
      metrics({ vehicleMinutes: 25, walkingMinutes: 1, walkingDistance: 80 }),
      2,
    );
    expect(
      selectDiversifiedRoutes([moreWalking, lessWalking], 'balanced', 1)[0],
    ).toBe(moreWalking);
    expect(
      selectDiversifiedRoutes([moreWalking, lessWalking], 'less_walking', 1)[0],
    ).toBe(lessWalking);

    const fastTransfer = result(
      'Con transbordo',
      metrics({ vehicleMinutes: 5, waitingMinutes: 8, transferCount: 1 }),
      2,
    );
    const slowerDirect = result(
      'Sin transbordo',
      metrics({ vehicleMinutes: 25 }),
      2,
    );
    expect(
      selectDiversifiedRoutes([fastTransfer, slowerDirect], 'balanced', 1)[0],
    ).toBe(fastTransfer);
    expect(
      selectDiversifiedRoutes(
        [fastTransfer, slowerDirect],
        'fewer_transfers',
        1,
      )[0],
    ).toBe(slowerDirect);
  });

  it('el costo nuevo no cambia al agregar una alternativa mala, a diferencia del min-max', () => {
    const first = result(
      'A',
      metrics({ vehicleMinutes: 10, walkingMinutes: 0 }),
      10,
      10,
    );
    const second = result(
      'B',
      metrics({ vehicleMinutes: 12, walkingMinutes: 0 }),
      2,
      12,
    );
    const bad = result(
      'Mala',
      metrics({ vehicleMinutes: 100, walkingMinutes: 0 }),
      10,
      100,
    );
    const firstCost = calculateGeneralizedCost({
      ...first,
      metrics: getPlannerMetrics(first),
    });
    const secondCost = calculateGeneralizedCost({
      ...second,
      metrics: getPlannerMetrics(second),
    });

    expect(
      calculateGeneralizedCost({ ...first, metrics: getPlannerMetrics(first) }),
    ).toBe(firstCost);
    expect(
      calculateGeneralizedCost({
        ...second,
        metrics: getPlannerMetrics(second),
      }),
    ).toBe(secondCost);
    expect(calculateLegacyScores([first, second])[0]).toBeLessThan(
      calculateLegacyScores([first, second])[1],
    );
    expect(calculateLegacyScores([first, second, bad])[0]).toBeGreaterThan(
      calculateLegacyScores([first, second, bad])[1],
    );
  });

  it('no vuelve a ponderar totalDistance y resuelve empates de forma determinista', () => {
    const shortDistance = result('B', metrics(), 2, 2_000);
    const longDistance = result('A', metrics(), 2, 20_000);

    expect(
      calculateGeneralizedCost({
        ...shortDistance,
        metrics: getPlannerMetrics(shortDistance),
      }),
    ).toBe(
      calculateGeneralizedCost({
        ...longDistance,
        metrics: getPlannerMetrics(longDistance),
      }),
    );
    expect(
      selectDiversifiedRoutes([shortDistance, longDistance], 'balanced', 1)[0],
    ).toBe(longDistance);
  });

  it('tolera métricas faltantes y evita alternativas prácticamente duplicadas', () => {
    const incomplete: PlannerResult = {
      steps: [{ type: 'walk', instruction: 'Camina' }],
      totalDistance: 0,
      totalDuration: 0,
      totalFare: Number.NaN,
      routeName: 'Incompleta',
    };
    expect(
      Number.isFinite(
        calculateGeneralizedCost({
          ...incomplete,
          metrics: getPlannerMetrics(incomplete),
        }),
      ),
    ).toBe(true);

    const original = result('Duplicada', metrics(), 2);
    const duplicate = result('Duplicada', metrics({ vehicleMinutes: 20.5 }), 2);
    expect(
      selectDiversifiedRoutes([original, duplicate], 'balanced', 4),
    ).toHaveLength(1);
  });

  it('diversifica recomendada, rápida, barata y de menor caminata sin duplicados', () => {
    const balanced = result('Equilibrada', metrics({ vehicleMinutes: 15 }), 2);
    const fastest = result('Rápida', metrics({ vehicleMinutes: 8 }), 6);
    const cheapest = result('Barata', metrics({ vehicleMinutes: 25 }), 0.5);
    const lessWalking = result(
      'Poca caminata',
      metrics({ vehicleMinutes: 22, walkingMinutes: 0.5, walkingDistance: 30 }),
      2,
    );
    const selected = selectDiversifiedRoutes(
      [balanced, fastest, cheapest, lessWalking],
      'balanced',
      4,
    );

    expect(new Set(selected.map((option) => option.routeName)).size).toBe(
      selected.length,
    );
    expect(selected).toEqual(
      expect.arrayContaining([fastest, cheapest, lessWalking]),
    );
  });
});
