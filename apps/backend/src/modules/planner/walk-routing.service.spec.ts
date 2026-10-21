import type { ConfigService } from '@nestjs/config';
import { WalkRoutingService } from './walk-routing.service';

function config(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('WalkRoutingService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('solicita a Google una geometría peatonal GeoJSON', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        routes: [
          {
            distanceMeters: 180,
            polyline: {
              geoJsonLinestring: {
                type: 'LineString',
                coordinates: [
                  [-75.2, -12.06],
                  [-75.201, -12.061],
                ],
              },
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new WalkRoutingService(
      config({
        'planner.walkRoutingProvider': 'google',
        'planner.googleRoutesApiKey': 'test-key',
      }),
    );

    await expect(
      service.getWalkPath(
        { lat: -12.06, lng: -75.2 },
        { lat: -12.061, lng: -75.201 },
      ),
    ).resolves.toEqual({
      distance: 180,
      path: [
        { lat: -12.06, lng: -75.2 },
        { lat: -12.061, lng: -75.201 },
      ],
    });

    const fetchCalls = fetchMock.mock.calls as unknown as Array<
      [string, RequestInit]
    >;
    const request = fetchCalls[0][1];
    expect(JSON.parse(request.body as string)).toMatchObject({
      travelMode: 'WALK',
      polylineEncoding: 'GEO_JSON_LINESTRING',
    });
  });

  it('no conserva respuestas de Google después de completar la solicitud', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        routes: [
          {
            distanceMeters: 180,
            polyline: {
              geoJsonLinestring: {
                coordinates: [
                  [-75.2, -12.06],
                  [-75.201, -12.061],
                ],
              },
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new WalkRoutingService(
      config({
        'planner.walkRoutingProvider': 'google',
        'planner.googleRoutesApiKey': 'test-key',
      }),
    );
    const from = { lat: -12.06, lng: -75.2 };
    const to = { lat: -12.061, lng: -75.201 };

    await service.getWalkPath(from, to);
    await service.getWalkPath(from, to);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('usa el respaldo local si el proveedor Google no tiene clave', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new WalkRoutingService(
      config({ 'planner.walkRoutingProvider': 'google' }),
    );

    await expect(
      service.getWalkPath(
        { lat: -12.06, lng: -75.2 },
        { lat: -12.061, lng: -75.201 },
      ),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limita a cuatro las solicitudes simultáneas a Google', async () => {
    let releaseRequests: (() => void) | undefined;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const fetchMock = jest.fn().mockImplementation(async () => {
      activeRequests++;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await requestGate;
      activeRequests--;
      return {
        ok: true,
        json: jest.fn().mockResolvedValue({
          routes: [
            {
              distanceMeters: 180,
              polyline: {
                geoJsonLinestring: {
                  coordinates: [
                    [-75.2, -12.06],
                    [-75.201, -12.061],
                  ],
                },
              },
            },
          ],
        }),
      };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const service = new WalkRoutingService(
      config({
        'planner.walkRoutingProvider': 'google',
        'planner.googleRoutesApiKey': 'test-key',
      }),
    );

    const requests = Array.from({ length: 6 }, (_, index) =>
      service.getWalkPath(
        { lat: -12.06, lng: -75.2 },
        { lat: -12.061 - index * 0.001, lng: -75.201 },
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);
    releaseRequests?.();
    await Promise.all(requests);

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(maximumActiveRequests).toBe(4);
  });
});
