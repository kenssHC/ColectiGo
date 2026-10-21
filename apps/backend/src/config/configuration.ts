import { registerAs } from '@nestjs/config';
import { createDatabaseConnectionSettings } from './database-connection';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: process.env.CORS_ORIGINS ?? '*',
}));

export const databaseConfig = registerAs('database', () =>
  createDatabaseConnectionSettings(),
);

export const plannerConfig = registerAs('planner', () => ({
  walkRoutingProvider: (
    process.env.WALK_ROUTING_PROVIDER ??
    (process.env.NODE_ENV === 'production' ? 'none' : 'osrm')
  )
    .trim()
    .toLowerCase(),
  // Servidor OSRM con perfil peatonal (datos OpenStreetMap, cortesía de FOSSGIS).
  // Deja la variable vacía (WALK_ROUTING_URL=) para desactivar el ruteo por calles.
  walkRoutingUrl:
    process.env.WALK_ROUTING_URL ??
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'https://routing.openstreetmap.de/routed-foot'),
  // Key exclusiva del backend para Routes API. Nunca reutilizar la key Android.
  googleRoutesApiKey: process.env.GOOGLE_ROUTES_API_KEY?.trim() ?? '',
}));

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
}));

export const googleAuthConfig = registerAs('googleAuth', () => ({
  webClientId: process.env.GOOGLE_AUTH_WEB_CLIENT_ID?.trim() ?? '',
}));

export const mailConfig = registerAs('mail', () => ({
  host: process.env.SMTP_HOST ?? '',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: process.env.SMTP_SECURE?.toLowerCase() === 'true',
  requireTls: process.env.SMTP_REQUIRE_TLS?.toLowerCase() !== 'false',
  user: process.env.SMTP_USER ?? '',
  password: process.env.SMTP_PASSWORD ?? '',
  from: process.env.SMTP_FROM ?? '',
  routeSuggestionsEmail: process.env.ROUTE_SUGGESTIONS_EMAIL ?? '',
}));
