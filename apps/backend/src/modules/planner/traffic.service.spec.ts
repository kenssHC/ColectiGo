import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { LatLng } from '@collectigo/shared';
import { TrafficService } from './traffic.service';

const path: LatLng[] = [
  { lat: -12.06, lng: -75.21 },
  { lat: -12.05, lng: -75.2 },
];

function config(apiKey = 'server-key'): ConfigService {
  return {
    get: jest.fn((name: string) => {
      if (name === 'planner.googleRoutesApiKey') return apiKey;
      if (name === 'app.nodeEnv') return 'test';
      return undefined;
    }),
  } as unknown as ConfigService;
}

function googleResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function requestBody(options: RequestInit): Record<string, unknown> {
  if (typeof options.body !== 'string') {
    throw new Error('Se esperaba un body JSON serializado');
  }
  return JSON.parse(options.body) as Record<string, unknown>;
}

describe('TrafficService', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('obtiene tráfico actual con TRAFFIC_AWARE y conserva staticDuration', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      googleResponse({
        routes: [{ duration: '905.6s', staticDuration: '600s' }],
      }),
    );
    const service = new TrafficService(config());

    const result = await service.getTrafficAwareDuration(path, 3_000);

    expect(result).toMatchObject({
      durationSeconds: 906,
      durationWithoutTrafficSeconds: 600,
      source: 'GOOGLE_TRAFFIC',
    });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const body = requestBody(options);
    expect(body).toMatchObject({
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
    });
    // Omitirlo es la forma segura de pedir "ahora"; Google usa la hora de la solicitud.
    expect(body).not.toHaveProperty('departureTime');
    expect(options.headers).toMatchObject({
      'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
    });
  });

  it('usa staticDuration si Google no devuelve duración con tráfico', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        googleResponse({ routes: [{ staticDuration: '480s' }] }),
      );
    const service = new TrafficService(config());

    await expect(
      service.getTrafficAwareDuration(path, 2_000),
    ).resolves.toMatchObject({
      durationSeconds: 480,
      durationWithoutTrafficSeconds: 480,
      source: 'GOOGLE_STATIC',
    });
  });

  it('usa una estimación local válida cuando no hay key', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = new TrafficService(config(''));

    const result = await service.getTrafficAwareDuration(path, 3_000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe('LOCAL_ESTIMATE');
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(result.durationSeconds)).toBe(true);
  });

  it('incrementa el fallback local durante hora punta', async () => {
    const service = new TrafficService(config(''));

    const peak = await service.getTrafficAwareDuration(
      path,
      3_000,
      new Date('2026-08-21T18:00:00Z'),
    );
    const normal = await service.getTrafficAwareDuration(
      path,
      3_000,
      new Date('2026-08-21T20:00:00Z'),
    );

    expect(peak.durationSeconds).toBeGreaterThan(normal.durationSeconds);
  });

  it.each([
    ['timeout', Object.assign(new Error('timeout'), { name: 'TimeoutError' })],
    ['network error', new Error('ECONNRESET')],
  ])('activa fallback ante %s', async (_label, error) => {
    jest.spyOn(global, 'fetch').mockRejectedValue(error);
    const service = new TrafficService(config());

    const result = await service.getTrafficAwareDuration(path, 2_000);

    expect(result.source).toBe('LOCAL_ESTIMATE');
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it.each([400, 403, 429, 500])(
    'activa fallback ante HTTP %i sin reintentar',
    async (status) => {
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(googleResponse({}, status));
      const service = new TrafficService(config());

      const result = await service.getTrafficAwareDuration(path, 2_000);

      expect(result.source).toBe('LOCAL_ESTIMATE');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('activa fallback si la respuesta no contiene duraciones válidas', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(googleResponse({ routes: [{}] }));
    const service = new TrafficService(config());

    const result = await service.getTrafficAwareDuration(path, 2_000);

    expect(result.source).toBe('LOCAL_ESTIMATE');
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it('deduplica dos solicitudes idénticas que están simultáneamente en curso', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = jest.spyOn(global, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const service = new TrafficService(config());

    const first = service.getTrafficAwareDuration(path, 2_000);
    const second = service.getTrafficAwareDuration(path, 2_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(googleResponse({ routes: [{ duration: '300s' }] }));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toEqual(secondResult);
    expect(service.getDiagnosticsSnapshot()).toMatchObject({
      inFlightHits: 1,
      inFlightMisses: 1,
      googleRequests: 1,
    });
  });

  it('no conserva el ETA de Google después de finalizar la solicitud', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(googleResponse({ routes: [{ duration: '300s' }] }));
    const service = new TrafficService(config());

    await service.getTrafficAwareDuration(path, 2_000);
    await service.getTrafficAwareDuration(path, 2_000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('limita a cuatro las consultas simultáneas a Google', async () => {
    let active = 0;
    let maximumActive = 0;
    const resolvers: Array<() => void> = [];
    jest.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          active++;
          maximumActive = Math.max(maximumActive, active);
          resolvers.push(() => {
            active--;
            resolve(googleResponse({ routes: [{ duration: '300s' }] }));
          });
        }),
    );
    const service = new TrafficService(config());
    const requests = Array.from({ length: 6 }, (_, index) =>
      service.getTrafficAwareDuration(
        [path[0], { ...path[1], lng: path[1].lng + index * 0.001 }],
        2_000,
      ),
    );

    expect(active).toBe(4);
    const firstBatch = resolvers.splice(0, 4);
    firstBatch.forEach((resolve) => resolve());
    await Promise.all(requests.slice(0, 4));
    expect(maximumActive).toBe(4);
    expect(active).toBe(2);
    resolvers.splice(0).forEach((resolve) => resolve());
    await Promise.all(requests);

    expect(maximumActive).toBe(4);
  });

  it('usa puntos de paso via, limita intermediarios y admite salida futura', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(googleResponse({ routes: [{ duration: '300s' }] }));
    const longPath = Array.from({ length: 40 }, (_, index) => ({
      lat: -12.06 + index * 0.001,
      lng: -75.21 + index * 0.001,
    }));
    const departureTime = new Date(Date.now() + 60 * 60_000);
    const service = new TrafficService(config());

    await service.getTrafficAwareDuration(longPath, 8_000, departureTime);

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const body = requestBody(options) as {
      intermediates: Array<{ via: boolean }>;
      departureTime: string;
    };
    expect(body.intermediates).toHaveLength(25);
    expect(body.intermediates.every((waypoint) => waypoint.via)).toBe(true);
    expect(body.departureTime).toBe(departureTime.toISOString());
  });
});

describe('TrafficService.getSpeedFactor', () => {
  const service = new TrafficService(config(''));

  it('reduce la velocidad en hora punta de Perú', () => {
    // 13:00 en Lima = 18:00 UTC
    expect(
      service.getSpeedFactor(new Date('2026-08-21T18:00:00Z')),
    ).toBeLessThan(1);
  });

  it('mantiene velocidad normal fuera de hora punta', () => {
    // 15:00 en Lima = 20:00 UTC
    expect(service.getSpeedFactor(new Date('2026-08-21T20:00:00Z'))).toBe(1);
  });
});
