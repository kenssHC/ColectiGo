import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppDataSource } from '../data-source';
import { CompanyEntity } from '../modules/routes/entities/company.entity';
import { FleetEntity } from '../modules/routes/entities/fleet.entity';
import { RouteEntity } from '../modules/routes/entities/route.entity';
import { RoutePathEntity } from '../modules/routes/entities/route-path.entity';
import type { LatLng, RouteDirection, VehicleType } from '@collectigo/shared';

/**
 * Importa las rutas reales desde los archivos GeoJSON de src/seeds/data.
 *
 * Cada Feature (LineString) debe tener estas properties:
 *   empresa, codigo_empresa, flota, tipo (ej. TA-11), tarifa,
 *   paradero_inicio, paradero_fin, direccion (ida | vuelta,
 *   opcionalmente "con bifurcación"), imagen (URL opcional).
 *
 * El importador es idempotente: reutiliza empresas/flotas/rutas existentes
 * y reemplaza el recorrido si ya existía esa dirección+variante.
 */

const DATA_DIR = join(__dirname, 'data');

interface GeoJsonFeature {
  type: 'Feature';
  properties: {
    empresa: string;
    codigo_empresa: string;
    flota: string | number;
    tipo: string;
    tarifa: number;
    paradero_inicio: string;
    paradero_fin: string;
    direccion: string;
    imagen?: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
}

interface GeoJsonFile {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/** TA = auto/colectivo, TC = camioneta/combi, TM = masivo (bus). */
function serviceTypeFromCode(tipo: string): VehicleType {
  const prefix = tipo.trim().toUpperCase().split('-')[0];
  if (prefix === 'TC') return 'combi';
  if (prefix === 'TM') return 'bus';
  return 'colectivo';
}

function parseDirection(direccion: string): { direction: RouteDirection; variant: string | null } {
  const normalized = direccion.trim().toLowerCase();
  const direction: RouteDirection = normalized.startsWith('vuelta') ? 'vuelta' : 'ida';
  const variant = normalized.includes('bifurc') ? 'con bifurcación' : null;
  return { direction, variant };
}

/** Las URLs placeholder (contienen "...") se guardan como null. */
function sanitizeImageUrl(url: string | undefined): string | null {
  if (!url || url.includes('...')) return null;
  return url;
}

async function importFeature(feature: GeoJsonFeature, sourceFile: string): Promise<string> {
  const props = feature.properties;
  const required = [
    'empresa',
    'codigo_empresa',
    'flota',
    'tipo',
    'tarifa',
    'paradero_inicio',
    'paradero_fin',
    'direccion',
  ] as const;
  for (const key of required) {
    if (props[key] === undefined || props[key] === null || props[key] === '') {
      throw new Error(`${sourceFile}: falta la propiedad "${key}"`);
    }
  }
  if (feature.geometry.type !== 'LineString' || feature.geometry.coordinates.length < 2) {
    throw new Error(`${sourceFile}: la geometría debe ser un LineString con al menos 2 puntos`);
  }

  const companyRepo = AppDataSource.getRepository(CompanyEntity);
  const fleetRepo = AppDataSource.getRepository(FleetEntity);
  const routeRepo = AppDataSource.getRepository(RouteEntity);
  const pathRepo = AppDataSource.getRepository(RoutePathEntity);

  // Empresa (única por código).
  let company = await companyRepo.findOne({ where: { code: props.codigo_empresa } });
  if (!company) {
    company = await companyRepo.save(
      companyRepo.create({ code: props.codigo_empresa, name: props.empresa }),
    );
  } else if (company.name !== props.empresa) {
    company.name = props.empresa;
    company = await companyRepo.save(company);
  }

  // Flota (única por empresa + número).
  const fleetNumber = String(props.flota);
  let fleet = await fleetRepo.findOne({
    where: { number: fleetNumber, company: { id: company.id } },
  });
  const imageUrl = sanitizeImageUrl(props.imagen);
  if (!fleet) {
    fleet = await fleetRepo.save(
      fleetRepo.create({ number: fleetNumber, company, vehicleImageUrl: imageUrl }),
    );
  } else if (imageUrl && fleet.vehicleImageUrl !== imageUrl) {
    fleet.vehicleImageUrl = imageUrl;
    fleet = await fleetRepo.save(fleet);
  }

  // Ruta (línea) dentro de la flota.
  const { direction, variant } = parseDirection(props.direccion);
  const routeName = props.tipo.trim();
  let route = await routeRepo.findOne({
    where: { name: routeName, fleet: { id: fleet.id } },
  });
  if (!route) {
    route = await routeRepo.save(
      routeRepo.create({
        name: routeName,
        type: serviceTypeFromCode(routeName),
        fare: Number(props.tarifa),
        status: 'active',
        // Los terminales canónicos se toman del sentido de ida.
        startTerminalName: direction === 'ida' ? props.paradero_inicio : props.paradero_fin,
        endTerminalName: direction === 'ida' ? props.paradero_fin : props.paradero_inicio,
        fleet,
      }),
    );
  } else {
    route.fare = Number(props.tarifa);
    if (direction === 'ida') {
      route.startTerminalName = props.paradero_inicio;
      route.endTerminalName = props.paradero_fin;
    }
    route = await routeRepo.save(route);
  }

  // Recorrido: GeoJSON usa [lng, lat]; se voltea a {lat, lng}.
  const coordinates: LatLng[] = feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

  // Idempotencia: reemplaza el recorrido de esa dirección + variante.
  const deleteQuery = pathRepo
    .createQueryBuilder()
    .delete()
    .where('route_id = :routeId', { routeId: route.id })
    .andWhere('direction = :direction', { direction });
  if (variant === null) {
    deleteQuery.andWhere('variant_name IS NULL');
  } else {
    deleteQuery.andWhere('variant_name = :variant', { variant });
  }
  await deleteQuery.execute();
  await pathRepo.save(
    pathRepo.create({
      route,
      direction,
      variantName: variant,
      startName: props.paradero_inicio,
      endName: props.paradero_fin,
      coordinates,
    }),
  );

  const variantLabel = variant ? ` (${variant})` : '';
  return `${company.name} · flota ${fleet.number} · ${route.name} · ${direction}${variantLabel}: ${coordinates.length} puntos`;
}

async function seed(): Promise<void> {
  const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.geojson'));
  if (files.length === 0) {
    console.log(`No hay archivos .geojson en ${DATA_DIR}; nada que importar.`);
    return;
  }

  await AppDataSource.initialize();

  try {
    let imported = 0;
    for (const file of files) {
      const raw = readFileSync(join(DATA_DIR, file), 'utf8');
      const geojson = JSON.parse(raw) as GeoJsonFile;

      for (const feature of geojson.features ?? []) {
        const summary = await importFeature(feature, file);
        console.log(`Importado: ${summary}`);
        imported++;
      }
    }
    console.log(`Importación completada: ${imported} recorrido(s) de ${files.length} archivo(s).`);
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Error importando rutas:', error);
  process.exitCode = 1;
});
