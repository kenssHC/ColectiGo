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
  walkRoutingUrl: process.env.WALK_ROUTING_URL ?? 'https://routing.openstreetmap.de/routed-foot',
  // API key de Google (Routes API habilitada) para duración con tráfico real.
  // Sin key, se estima con velocidad promedio ajustada por hora punta.
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
}));

export const firebaseConfig = registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
}));
