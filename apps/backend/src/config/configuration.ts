import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: process.env.CORS_ORIGINS ?? '*',
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'collectigo',
}));

export const plannerConfig = registerAs('planner', () => ({
  // Servidor OSRM con perfil peatonal (datos OpenStreetMap, cortesía de FOSSGIS).
  // Deja la variable vacía (WALK_ROUTING_URL=) para desactivar el ruteo por calles.
  walkRoutingUrl:
    process.env.WALK_ROUTING_URL ??
    'https://routing.openstreetmap.de/routed-foot',
  // Key exclusiva del backend para Routes API. El nombre anterior queda como
  // compatibilidad temporal, pero no conviene reutilizar la key del SDK Android.
  googleRoutesApiKey:
    process.env.GOOGLE_ROUTES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '',
}));

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
}));

export const mailConfig = registerAs('mail', () => ({
  host: process.env.SMTP_HOST ?? '',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER ?? '',
  password: process.env.SMTP_PASSWORD ?? '',
  from: process.env.SMTP_FROM ?? '',
  routeSuggestionsEmail: process.env.ROUTE_SUGGESTIONS_EMAIL ?? '',
}));
