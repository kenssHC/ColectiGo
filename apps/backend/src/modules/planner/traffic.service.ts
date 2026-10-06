import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LatLng } from '@collectigo/shared';

interface GoogleRoutesResponse {
  routes?: Array<{
    /** Duración con tráfico en formato "123s". */
    duration: string;
    distanceMeters: number;
  }>;
}

const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_MAX_ENTRIES = 300;
/** Las condiciones de tráfico se consideran vigentes durante 5 minutos. */
const CACHE_BUCKET_MS = 5 * 60_000;
/** La Routes API acepta hasta 25 puntos intermedios por solicitud. */
const MAX_INTERMEDIATES = 25;

/** Horas punta típicas de Huancayo (hora local de Perú, UTC-5 sin horario de verano). */
const PEAK_HOURS = new Set([7, 8, 12, 13, 18, 19, 20]);
/** En hora punta el vehículo avanza a ~65% de su velocidad habitual. */
const PEAK_SPEED_FACTOR = 0.65;

/**
 * Estima la duración real del tramo en vehículo usando la Google Routes API
 * con tráfico en tiempo real (routingPreference: TRAFFIC_AWARE).
 *
 * Si no hay GOOGLE_MAPS_API_KEY configurada o la API falla, el planner cae
 * de vuelta a una estimación por velocidad promedio ajustada por hora punta
 * (getSpeedFactor), así que un fallo aquí nunca rompe el cálculo.
 */
@Injectable()
export class TrafficService {
  private readonly logger = new Logger(TrafficService.name);
  private readonly apiKey: string;
  private readonly cache = new Map<string, Promise<number | null>>();

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('planner.googleMapsApiKey') ?? '';
  }

  /**
   * Duración en segundos del recorrido en vehículo siguiendo las paradas,
   * con tráfico actual. Devuelve null si la API no está disponible.
   */
  async getRideDurationSeconds(path: LatLng[]): Promise<number | null> {
    if (!this.apiKey || path.length < 2) return null;

    const key = this.cacheKey(path);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const request = this.fetchRideDuration(path).catch((error: unknown) => {
      this.cache.delete(key);
      this.logger.warn(
        `Tráfico de Google no disponible (${(error as Error).message}); se usará estimación por hora`,
      );
      return null;
    });

    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, request);

    return request;
  }

  /**
   * Factor de velocidad según la hora local de Perú, usado como respaldo
   * cuando no hay datos de tráfico en tiempo real (1 = fluido).
   */
  getSpeedFactor(now: Date = new Date()): number {
    const limaHour = (now.getUTCHours() + 24 - 5) % 24;
    return PEAK_HOURS.has(limaHour) ? PEAK_SPEED_FACTOR : 1;
  }

  private async fetchRideDuration(path: LatLng[]): Promise<number | null> {
    const toWaypoint = (p: LatLng) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    });

    const intermediates = this.sampleIntermediates(path.slice(1, -1));

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: toWaypoint(path[0]),
        destination: toWaypoint(path[path.length - 1]),
        ...(intermediates.length > 0 ? { intermediates: intermediates.map(toWaypoint) } : {}),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as GoogleRoutesResponse;
    const duration = data.routes?.[0]?.duration;
    if (!duration) return null;

    const seconds = Number.parseInt(duration, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  /** Reduce los puntos intermedios al máximo que acepta la API, muestreando uniformemente. */
  private sampleIntermediates(points: LatLng[]): LatLng[] {
    if (points.length <= MAX_INTERMEDIATES) return points;
    const step = points.length / MAX_INTERMEDIATES;
    return Array.from({ length: MAX_INTERMEDIATES }, (_, i) => points[Math.floor(i * step)]);
  }

  private cacheKey(path: LatLng[]): string {
    const bucket = Math.floor(Date.now() / CACHE_BUCKET_MS);
    const coords = path.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
    return `${bucket}|${coords}`;
  }
}
