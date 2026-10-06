import { PlannerService } from './planner.service';
import { TrafficService } from './traffic.service';
import type { RoutesService } from '../routes/routes.service';
import type { WalkPath, WalkRoutingService } from './walk-routing.service';
import type { RouteEntity } from '../routes/entities/route.entity';
import type { RoutePathEntity } from '../routes/entities/route-path.entity';
import type { LatLng, PlannerResult, RouteDirection, VehicleType } from '@collectigo/shared';

function makePath(
  direction: RouteDirection,
  coordinates: LatLng[],
  variantName: string | null = null,
): RoutePathEntity {
  return {
    id: `path-${direction}-${variantName ?? 'principal'}`,
    direction,
    variantName,
    startName: 'Terminal Inicio',
    endName: 'Terminal Fin',
    coordinates,
  } as RoutePathEntity;
}

function makeRoute(
  name: string,
  fare: number,
  paths: RoutePathEntity[],
  type: VehicleType = 'colectivo',
): RouteEntity {
  return {
    id: `route-${name}`,
    name,
    type,
    fare,
    color: '#000000',
    status: 'active',
    startTerminalName: 'Terminal Inicio',
    endTerminalName: 'Terminal Fin',
    fleet: {
      id: 'fleet-135',
      number: '135',
      vehicleImageUrl: null,
      company: { id: 'company-1', name: 'Virgen del Carmen', code: 'TR-0024' },
    },
    paths,
  } as RouteEntity;
}

interface ServiceMocks {
  walkPath?: WalkPath | null;
  rideSeconds?: number | null;
}

describe('PlannerService', () => {
  const origin: LatLng = { lat: 0, lng: 0 };
  const destination: LatLng = { lat: 0.02, lng: 0 };

  // Recorrido casi paralelo al eje del viaje, a ~55m de distancia lateral.
  const cheapRoute = makeRoute('TA-11', 1.0, [
    makePath('ida', [
      { lat: 0.001, lng: 0.0005 },
      { lat: 0.01, lng: 0.0005 },
      { lat: 0.019, lng: 0.0005 },
    ]),
  ]);

  // Ruta rápida pero cara: arranca pegada al origen/destino pero con desvío.
  const expressRoute = makeRoute(
    'TA-20',
    2.5,
    [
      makePath('ida', [
        { lat: 0.0005, lng: 0 },
        { lat: 0.01, lng: 0.003 },
        { lat: 0.0195, lng: 0 },
      ]),
    ],
    'auto',
  );

  function buildService(routes: RouteEntity[], mocks: ServiceMocks = {}): PlannerService {
    const routesService = {
      findAll: jest.fn().mockResolvedValue(routes),
    } as unknown as RoutesService;
    const walkRouting = {
      getWalkPath: jest.fn().mockResolvedValue(mocks.walkPath ?? null),
    } as unknown as WalkRoutingService;
    const traffic = {
      getRideDurationSeconds: jest.fn().mockResolvedValue(mocks.rideSeconds ?? null),
      getSpeedFactor: jest.fn().mockReturnValue(1),
    } as unknown as TrafficService;
    return new PlannerService(routesService, walkRouting, traffic);
  }

  function allOptions(response: {
    best: PlannerResult;
    alternatives: PlannerResult[];
  }): PlannerResult[] {
    return [response.best, ...response.alternatives];
  }

  function findTransit(options: PlannerResult[]): PlannerResult | undefined {
    return options.find((o) => o.steps.some((s) => s.type === 'ride'));
  }

  it('devuelve respuesta vacía sin rutas y con destino lejos para caminar', async () => {
    const service = buildService([]);
    const farAway: LatLng = { lat: 0.05, lng: 0 }; // ~5.5 km
    const response = await service.calculate(origin, farAway);

    expect(response.best.steps).toHaveLength(0);
    expect(response.alternatives).toHaveLength(0);
  });

  it('sin rutas de transporte ofrece llegar caminando si está cerca', async () => {
    const service = buildService([]);
    const response = await service.calculate(origin, destination); // ~2.2 km

    expect(response.best.steps).toHaveLength(1);
    expect(response.best.steps[0].type).toBe('walk');
    expect(response.best.totalFare).toBe(0);
    expect(response.best.routeName).toBe('A pie');
    expect(response.best.badges).toContain('walk_only');
  });

  it('permite subir y bajar en cualquier punto del recorrido', async () => {
    // Origen y destino a mitad de la ruta: no hay paraderos intermedios,
    // el punto de subida/bajada es la proyección sobre la polilínea.
    const midOrigin: LatLng = { lat: 0.005, lng: 0 };
    const midDestination: LatLng = { lat: 0.015, lng: 0 };
    const service = buildService([cheapRoute]);
    const response = await service.calculate(midOrigin, midDestination);
    const transit = findTransit(allOptions(response));

    expect(transit).toBeDefined();
    const rideStep = transit!.steps.find((s) => s.type === 'ride');

    // Sube a la altura de su posición (lat ≈ 0.005), no en el inicio de la ruta.
    expect(rideStep?.from?.lat).toBeCloseTo(0.005, 4);
    expect(rideStep?.to?.lat).toBeCloseTo(0.015, 4);
    // La caminata es solo el desvío lateral (~55 m), no hasta un paradero lejano.
    const walkStep = transit!.steps.find((s) => s.type === 'walk');
    expect(walkStep?.distance).toBeLessThan(80);
  });

  it('respeta el sentido del recorrido (usa la vuelta si la ida va en contra)', async () => {
    // Recorrido de ida que va de norte a sur; el viaje del usuario es sur → norte.
    const northToSouth: LatLng[] = [
      { lat: 0.019, lng: 0.0005 },
      { lat: 0.001, lng: 0.0005 },
    ];
    const southToNorth: LatLng[] = [...northToSouth].reverse();
    const route = makeRoute('TA-11', 1.0, [
      makePath('ida', northToSouth),
      makePath('vuelta', southToNorth),
    ]);

    const service = buildService([route]);
    const response = await service.calculate(origin, destination);
    const transit = findTransit(allOptions(response));

    expect(transit).toBeDefined();
    const rideStep = transit!.steps.find((s) => s.type === 'ride');
    // Avanza hacia el norte: solo el recorrido de vuelta lo permite.
    expect(rideStep!.from!.lat).toBeLessThan(rideStep!.to!.lat);
  });

  it('prefiere la variante más conveniente de la misma ruta', async () => {
    const straight: LatLng[] = [
      { lat: 0.001, lng: 0.0005 },
      { lat: 0.019, lng: 0.0005 },
    ];
    const detour: LatLng[] = [
      { lat: 0.001, lng: 0.0005 },
      { lat: 0.01, lng: 0.01 },
      { lat: 0.019, lng: 0.0005 },
    ];
    const route = makeRoute('TA-11', 1.0, [
      makePath('ida', straight),
      makePath('ida', detour, 'con bifurcación'),
    ]);

    const service = buildService([route]);
    const response = await service.calculate(origin, destination);
    const transit = findTransit(allOptions(response));

    // Gana el recorrido principal (sin bifurcación): menor distancia y tiempo.
    const rideStep = transit!.steps.find((s) => s.type === 'ride');
    expect(rideStep?.instruction).not.toContain('bifurcación');
  });

  it('elige la mejor ruta por puntaje combinado y lista alternativas', async () => {
    const service = buildService([expressRoute, cheapRoute]);
    const response = await service.calculate(origin, destination);
    const options = allOptions(response);

    // La económica equilibra tiempo, costo y distancia: gana el puntaje.
    expect(response.best.totalFare).toBe(1.0);

    // Las alternativas incluyen la expresa y la opción a pie.
    const fares = options.map((o) => o.totalFare).sort((a, b) => a - b);
    expect(fares).toEqual([0, 1.0, 2.5]);

    // Los puntajes están ordenados de mejor a peor.
    const scores = options.map((o) => o.score ?? 0);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);

    const express = options.find((o) => o.totalFare === 2.5);
    expect(express?.badges).toContain('fastest');
    expect(response.best.badges).toContain('cheapest');
  });

  it('incluye empresa, flota y pasos coherentes en el resultado', async () => {
    const service = buildService([cheapRoute]);
    const response = await service.calculate(origin, destination);
    const transit = findTransit(allOptions(response));

    expect(transit).toBeDefined();
    expect(transit!.routeName).toBe('TA-11');
    expect(transit!.companyName).toBe('Virgen del Carmen');
    expect(transit!.fleetNumber).toBe('135');

    const steps = transit!.steps;
    expect(steps.map((s) => s.type)).toEqual(['walk', 'board', 'ride', 'arrive']);
    expect(steps[1].fare).toBe(1.0);
    expect(steps[1].duration).toBe(240);
    expect(steps[1].instruction).toContain('Virgen del Carmen');
    expect(steps[1].instruction).toContain('flota 135');
    expect(transit!.totalDuration).toBe(steps.reduce((sum, s) => sum + (s.duration ?? 0), 0));

    // El paso "ride" trae la polilínea recortada para dibujar en el mapa.
    const rideStep = steps[2];
    expect(rideStep.path!.length).toBeGreaterThanOrEqual(2);
    expect(rideStep.path![0]).toEqual(rideStep.from);
    expect(rideStep.path![rideStep.path!.length - 1]).toEqual(rideStep.to);
  });

  it('usa la duración con tráfico real cuando Google responde', async () => {
    const service = buildService([cheapRoute], { rideSeconds: 900 });
    const response = await service.calculate(origin, destination);
    const transit = findTransit(allOptions(response));

    const rideStep = transit!.steps.find((s) => s.type === 'ride');
    expect(rideStep?.duration).toBe(900);
  });

  it('enriquece las caminatas con el trazado por calles cuando está disponible', async () => {
    const streetPath: WalkPath = {
      path: [
        { lat: 0, lng: 0 },
        { lat: 0.0005, lng: 0.0003 },
        { lat: 0.001, lng: 0.0005 },
      ],
      distance: 180,
    };
    const service = buildService([cheapRoute], { walkPath: streetPath });
    const response = await service.calculate(origin, destination);
    const transit = findTransit(allOptions(response));

    const walkStep = transit!.steps.find((s) => s.type === 'walk');
    expect(walkStep?.path).toEqual(streetPath.path);
    expect(walkStep?.distance).toBe(180);
    expect(walkStep?.instruction).toContain('180m');
  });

  it('mantiene la línea recta cuando el ruteo peatonal no está disponible', async () => {
    const service = buildService([cheapRoute]);
    const response = await service.calculate(origin, destination);
    const walkStep = findTransit(allOptions(response))!.steps.find((s) => s.type === 'walk');

    expect(walkStep?.path).toBeUndefined();
    expect(walkStep?.distance).toBeGreaterThan(0);
  });

  it('descarta tramos en vehículo demasiado cortos', async () => {
    // Viaje de ~100m: subir a un colectivo para eso no tiene sentido.
    const service = buildService([cheapRoute]);
    const response = await service.calculate(
      { lat: 0.005, lng: 0 },
      { lat: 0.0059, lng: 0 },
    );

    expect(findTransit(allOptions(response))).toBeUndefined();
    expect(response.best.badges).toContain('walk_only');
  });
});

describe('TrafficService.getSpeedFactor', () => {
  const config = { get: jest.fn().mockReturnValue('') };
  const service = new TrafficService(config as never);

  it('reduce la velocidad en hora punta de Perú', () => {
    // 13:00 en Lima = 18:00 UTC
    expect(service.getSpeedFactor(new Date('2026-08-21T18:00:00Z'))).toBeLessThan(1);
  });

  it('velocidad normal fuera de hora punta', () => {
    // 15:00 en Lima = 20:00 UTC
    expect(service.getSpeedFactor(new Date('2026-08-21T20:00:00Z'))).toBe(1);
  });
});
