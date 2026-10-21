import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LatLng } from '@collectigo/shared';

export interface WalkPath {
  /** Trazado de la caminata siguiendo las calles. */
  path: LatLng[];
  /** Distancia real caminando por las calles, en metros. */
  distance: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    distance: number;
    geometry: { coordinates: Array<[number, number]> };
  }>;
}

interface GoogleWalkRouteResponse {
  routes?: Array<{
    distanceMeters?: number;
    polyline?: {
      geoJsonLinestring?: {
        type?: string;
        coordinates?: Array<[number, number]>;
      };
    };
  }>;
}

interface GoogleWaypoint {
  location: { latLng: { latitude: number; longitude: number } };
}

type WalkRoutingProvider = 'osrm' | 'google' | 'none';

const REQUEST_TIMEOUT_MS = 4_000;
const CACHE_MAX_ENTRIES = 500;
const MAX_CONCURRENT_GOOGLE_REQUESTS = 4;
/** Caminatas muy cortas no justifican la llamada externa: la recta es suficiente. */
const MIN_WALK_METERS = 30;

/**
 * Calcula el trazado de caminatas siguiendo las calles usando OSRM
 * (perfil peatonal) sobre datos de OpenStreetMap. Si el servicio externo
 * no responde, el planner cae de vuelta a la línea recta, así que un
 * fallo aquí nunca rompe el cálculo de rutas.
 */
@Injectable()
export class WalkRoutingService {
  private readonly logger = new Logger(WalkRoutingService.name);
  private readonly provider: WalkRoutingProvider;
  private readonly baseUrl: string;
  private readonly googleApiKey: string;
  private readonly cache = new Map<string, Promise<WalkPath | null>>();
  private readonly googleWaiters: Array<() => void> = [];
  private activeGoogleRequests = 0;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const configuredProvider =
      config.get<string>('planner.walkRoutingProvider') ?? 'none';
    this.provider = ['osrm', 'google'].includes(configuredProvider)
      ? (configuredProvider as WalkRoutingProvider)
      : 'none';
    this.baseUrl = (config.get<string>('planner.walkRoutingUrl') ?? '').replace(
      /\/+$/,
      '',
    );
    this.googleApiKey = config.get<string>('planner.googleRoutesApiKey') ?? '';
  }

  async getWalkPath(from: LatLng, to: LatLng): Promise<WalkPath | null> {
    if (this.provider === 'none') return null;
    if (this.provider === 'osrm' && !this.baseUrl) return null;
    if (this.provider === 'google' && !this.googleApiKey) return null;
    if (this.roughDistance(from, to) < MIN_WALK_METERS) return null;

    const key = this.cacheKey(from, to);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const request = this.fetchWalkPath(from, to)
      .catch((error: unknown) => {
        // No cachear fallos: el próximo request reintenta contra el servicio.
        this.cache.delete(key);
        this.logger.warn(
          `Ruteo peatonal no disponible (${(error as Error).message}); se usará línea recta`,
        );
        return null;
      })
      .finally(() => {
        // Las políticas de Google restringen cachear el contenido de Routes API.
        // La entrada existe solo para compartir solicitudes simultáneas.
        if (this.provider === 'google') this.cache.delete(key);
      });

    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, request);

    return request;
  }

  private async fetchWalkPath(
    from: LatLng,
    to: LatLng,
  ): Promise<WalkPath | null> {
    return this.provider === 'google'
      ? this.withGoogleConcurrency(() => this.fetchGoogleWalkPath(from, to))
      : this.fetchOsrmWalkPath(from, to);
  }

  private async withGoogleConcurrency<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.activeGoogleRequests >= MAX_CONCURRENT_GOOGLE_REQUESTS) {
      await new Promise<void>((resolve) => this.googleWaiters.push(resolve));
    }

    this.activeGoogleRequests++;
    try {
      return await operation();
    } finally {
      this.activeGoogleRequests--;
      this.googleWaiters.shift()?.();
    }
  }

  private async fetchOsrmWalkPath(
    from: LatLng,
    to: LatLng,
  ): Promise<WalkPath | null> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${this.baseUrl}/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'User-Agent': 'ColectiGO/1.0 (planner)' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];
    if (data.code !== 'Ok' || !route || route.geometry.coordinates.length < 2) {
      return null;
    }

    return {
      path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distance: route.distance,
    };
  }

  private async fetchGoogleWalkPath(
    from: LatLng,
    to: LatLng,
  ): Promise<WalkPath | null> {
    const waypoint = (point: LatLng): GoogleWaypoint => ({
      location: {
        latLng: { latitude: point.lat, longitude: point.lng },
      },
    });
    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.googleApiKey,
          'X-Goog-FieldMask':
            'routes.distanceMeters,routes.polyline.geoJsonLinestring',
        },
        body: JSON.stringify({
          origin: waypoint(from),
          destination: waypoint(to),
          travelMode: 'WALK',
          polylineQuality: 'HIGH_QUALITY',
          polylineEncoding: 'GEO_JSON_LINESTRING',
        }),
      },
    );

    if (!response.ok) throw new Error(`Google Routes HTTP ${response.status}`);

    const data = (await response.json()) as GoogleWalkRouteResponse;
    const route = data.routes?.[0];
    const coordinates = route?.polyline?.geoJsonLinestring?.coordinates;
    if (!route?.distanceMeters || !coordinates || coordinates.length < 2) {
      return null;
    }

    return {
      path: coordinates.map(([lng, lat]) => ({ lat, lng })),
      distance: route.distanceMeters,
    };
  }

  private cacheKey(from: LatLng, to: LatLng): string {
    // 5 decimales ≈ 1 metro de precisión: suficiente para deduplicar.
    const r = (n: number): string => n.toFixed(5);
    return `${this.provider}|${r(from.lat)},${r(from.lng)}|${r(to.lat)},${r(to.lng)}`;
  }

  /** Aproximación equirectangular, suficiente para el umbral de caminata mínima. */
  private roughDistance(a: LatLng, b: LatLng): number {
    const dLat = (b.lat - a.lat) * 111_320;
    const dLng = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
    return Math.sqrt(dLat ** 2 + dLng ** 2);
  }
}
