import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LatLng, VehicleTimeSource } from '@collectigo/shared';

interface GoogleRoutesResponse {
  routes?: Array<{
    /** ETA considerando tráfico, en formato protobuf Duration (por ejemplo, "123.5s"). */
    duration?: string;
    /** ETA sin tráfico actual, devuelto en la misma respuesta. */
    staticDuration?: string;
  }>;
}

export interface RideDurationEstimate {
  durationSeconds: number;
  durationWithoutTrafficSeconds?: number;
  source: VehicleTimeSource;
  /** Momento en que se obtuvo la estimación. No implica la edad del sensor de Google. */
  fetchedAt: string;
}

export interface TrafficDiagnostics {
  googleRequests: number;
  inFlightHits: number;
  inFlightMisses: number;
  googleTrafficResults: number;
  googleStaticResults: number;
  localFallbacks: number;
}

class GoogleRoutesError extends Error {
  constructor(
    readonly status: number,
    message = `Google Routes respondió HTTP ${status}`,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 5_000;
const MAX_CONCURRENT_GOOGLE_REQUESTS = 4;
const MAX_IN_FLIGHT_ENTRIES = 100;
/** Máximo oficial de Compute Routes; mejora la fidelidad de recorridos curvos. */
const MAX_INTERMEDIATES = 25;
const VEHICLE_SPEED_METERS_PER_MIN = 300;
const WARNING_THROTTLE_MS = 60_000;

/** Horas punta típicas de Huancayo (hora local de Perú, UTC-5 sin horario de verano). */
const PEAK_HOURS = new Set([7, 8, 12, 13, 18, 19, 20]);
/** En hora punta el vehículo avanza a ~65% de su velocidad habitual. */
const PEAK_SPEED_FACTOR = 0.65;

/**
 * Refina el tiempo de cada tramo vehicular con Google Routes API.
 *
 * La API se consulta desde el backend y las solicitudes iguales que estén en
 * curso se comparten. El resultado no se conserva después de completarse:
 * las políticas de Routes API restringen almacenar la mayor parte de su
 * contenido, incluida la duración estimada.
 */
@Injectable()
export class TrafficService {
  private readonly logger = new Logger(TrafficService.name);
  private readonly apiKey: string;
  private readonly isDevelopment: boolean;
  private readonly inFlight = new Map<string, Promise<RideDurationEstimate>>();
  private readonly waiters: Array<() => void> = [];
  private activeGoogleRequests = 0;
  private readonly lastWarningAt = new Map<string, number>();
  private readonly diagnostics: TrafficDiagnostics = {
    googleRequests: 0,
    inFlightHits: 0,
    inFlightMisses: 0,
    googleTrafficResults: 0,
    googleStaticResults: 0,
    localFallbacks: 0,
  };

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('planner.googleRoutesApiKey') ?? '';
    this.isDevelopment =
      (config.get<string>('app.nodeEnv') ?? 'development') === 'development';
  }

  /**
   * Devuelve siempre una duración positiva. Si Google no está disponible,
   * utiliza distancia/velocidad con ajuste local por hora punta.
   *
   * Omitir departureTime significa "salir ahora" según Routes API. Se acepta
   * una fecha futura para que la interfaz pueda ampliarse sin rediseñarla.
   */
  async getTrafficAwareDuration(
    path: LatLng[],
    rideDistanceMeters: number,
    departureTime?: Date,
  ): Promise<RideDurationEstimate> {
    const fallback = (): RideDurationEstimate =>
      this.localEstimate(path, rideDistanceMeters, departureTime);

    if (!this.apiKey || path.length < 2) return fallback();

    const sampledPath = this.samplePath(path);
    const key = this.requestKey(sampledPath, departureTime);
    const pending = this.inFlight.get(key);
    if (pending) {
      this.diagnostics.inFlightHits++;
      this.debug('Google Routes: solicitud simultánea reutilizada');
      return pending;
    }

    this.diagnostics.inFlightMisses++;
    this.debug('Google Routes: solicitud nueva (sin coincidencia en curso)');
    if (this.inFlight.size >= MAX_IN_FLIGHT_ENTRIES) {
      const oldestKey = this.inFlight.keys().next().value;
      if (oldestKey) this.inFlight.delete(oldestKey);
    }

    const request = this.withGoogleConcurrency(() =>
      this.fetchRideDuration(sampledPath, departureTime),
    )
      .catch((error: unknown) => {
        this.logGoogleFailure(error);
        return fallback();
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, request);
    return request;
  }

  getDiagnosticsSnapshot(): TrafficDiagnostics {
    return { ...this.diagnostics };
  }

  /** Factor local de respaldo; no se aplica encima de un ETA de Google. */
  getSpeedFactor(now: Date = new Date()): number {
    const limaHour = (now.getUTCHours() + 24 - 5) % 24;
    return PEAK_HOURS.has(limaHour) ? PEAK_SPEED_FACTOR : 1;
  }

  private async fetchRideDuration(
    sampledPath: LatLng[],
    departureTime?: Date,
  ): Promise<RideDurationEstimate> {
    const startedAt = Date.now();
    this.diagnostics.googleRequests++;

    const toWaypoint = (point: LatLng, via = false) => ({
      location: {
        latLng: { latitude: point.lat, longitude: point.lng },
      },
      ...(via ? { via: true } : {}),
    });
    const origin = sampledPath[0];
    const destination = sampledPath[sampledPath.length - 1];
    const intermediates = sampledPath.slice(1, -1);
    const validDepartureTime = this.futureDepartureTime(departureTime);

    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
        },
        body: JSON.stringify({
          origin: toWaypoint(origin),
          destination: toWaypoint(destination),
          ...(intermediates.length > 0
            ? {
                intermediates: intermediates.map((point) =>
                  toWaypoint(point, true),
                ),
              }
            : {}),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          ...(validDepartureTime
            ? { departureTime: validDepartureTime.toISOString() }
            : {}),
        }),
      },
    );

    if (!response.ok) throw new GoogleRoutesError(response.status);

    const data = (await response.json()) as GoogleRoutesResponse;
    const route = data.routes?.[0];
    const trafficSeconds = this.parseDuration(route?.duration);
    const staticSeconds = this.parseDuration(route?.staticDuration);
    const fetchedAt = new Date().toISOString();

    if (trafficSeconds !== null) {
      this.diagnostics.googleTrafficResults++;
      this.debug(
        `Google Routes: tráfico obtenido en ${Date.now() - startedAt} ms`,
      );
      return {
        durationSeconds: trafficSeconds,
        ...(staticSeconds !== null
          ? { durationWithoutTrafficSeconds: staticSeconds }
          : {}),
        source: 'GOOGLE_TRAFFIC',
        fetchedAt,
      };
    }

    if (staticSeconds !== null) {
      this.diagnostics.googleStaticResults++;
      this.debug(
        `Google Routes: solo duración estática obtenida en ${Date.now() - startedAt} ms`,
      );
      return {
        durationSeconds: staticSeconds,
        durationWithoutTrafficSeconds: staticSeconds,
        source: 'GOOGLE_STATIC',
        fetchedAt,
      };
    }

    throw new Error('Google Routes no devolvió una duración válida');
  }

  private localEstimate(
    path: LatLng[],
    rideDistanceMeters: number,
    departureTime?: Date,
  ): RideDurationEstimate {
    this.diagnostics.localFallbacks++;
    const pathDistance = this.pathDistance(path);
    const distance =
      Number.isFinite(rideDistanceMeters) && rideDistanceMeters > 0
        ? rideDistanceMeters
        : pathDistance;
    const safeDistance =
      Number.isFinite(distance) && distance > 0 ? distance : 1;
    const speedFactor = this.getSpeedFactor(departureTime ?? new Date());
    const seconds = Math.max(
      1,
      Math.round(
        (safeDistance / (VEHICLE_SPEED_METERS_PER_MIN * speedFactor)) * 60,
      ),
    );

    this.debug('Tiempo vehicular: fallback local activado');
    return {
      durationSeconds: seconds,
      source: 'LOCAL_ESTIMATE',
      fetchedAt: new Date().toISOString(),
    };
  }

  private async withGoogleConcurrency<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    if (this.activeGoogleRequests >= MAX_CONCURRENT_GOOGLE_REQUESTS) {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }

    this.activeGoogleRequests++;
    try {
      return await operation();
    } finally {
      this.activeGoogleRequests--;
      this.waiters.shift()?.();
    }
  }

  /** Muestrea toda la geometría, incluidos origen y destino. */
  private samplePath(path: LatLng[]): LatLng[] {
    const maxPoints = MAX_INTERMEDIATES + 2;
    if (path.length <= maxPoints) return path;

    return Array.from({ length: maxPoints }, (_, index) => {
      const sourceIndex = Math.round(
        (index * (path.length - 1)) / (maxPoints - 1),
      );
      return path[sourceIndex];
    });
  }

  private requestKey(path: LatLng[], departureTime?: Date): string {
    const departure = this.futureDepartureTime(departureTime);
    const departureKey = departure
      ? Math.floor(departure.getTime() / 60_000).toString()
      : 'now';
    const coords = path
      .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
      .join(';');
    return `${departureKey}|${coords}`;
  }

  private futureDepartureTime(value?: Date): Date | undefined {
    if (!value || !Number.isFinite(value.getTime())) return undefined;
    // Un timestamp generado como "ahora" puede quedar en el pasado durante la
    // llamada. Omitirlo activa el "ahora" nativo de Google.
    return value.getTime() > Date.now() + 1_000 ? value : undefined;
  }

  private parseDuration(value?: string): number | null {
    if (!value?.endsWith('s')) return null;
    const seconds = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
  }

  private pathDistance(path: LatLng[]): number {
    let total = 0;
    for (let index = 1; index < path.length; index++) {
      total += this.haversine(path[index - 1], path[index]);
    }
    return total;
  }

  private haversine(first: LatLng, second: LatLng): number {
    const radius = 6_371_000;
    const firstLat = (first.lat * Math.PI) / 180;
    const secondLat = (second.lat * Math.PI) / 180;
    const deltaLat = secondLat - firstLat;
    const deltaLng = ((second.lng - first.lng) * Math.PI) / 180;
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private logGoogleFailure(error: unknown): void {
    const message =
      error instanceof Error ? error.message : 'error desconocido';
    const category =
      error instanceof GoogleRoutesError ? `http-${error.status}` : 'network';
    const now = Date.now();
    const lastWarning = this.lastWarningAt.get(category) ?? 0;

    if (now - lastWarning >= WARNING_THROTTLE_MS) {
      this.lastWarningAt.set(category, now);
      this.logger.warn(
        `Google Routes no disponible (${message}); se usará estimación local`,
      );
    } else {
      this.debug(`Google Routes: ${message}; fallback local`);
    }
  }

  private debug(message: string): void {
    if (this.isDevelopment) this.logger.debug(message);
  }
}
