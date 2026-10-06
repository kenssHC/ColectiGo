import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { LatLng, RouteDirection } from '@collectigo/shared';
import type { RouteEntity } from './route.entity';

/**
 * Recorrido concreto de una ruta: sentido (ida/vuelta) y variante opcional
 * (ej. "con bifurcación"). No hay paraderos intermedios: los pasajeros
 * suben y bajan en cualquier punto de la polilínea.
 */
@Entity('route_paths')
export class RoutePathEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['ida', 'vuelta'] })
  direction: RouteDirection;

  /** null = recorrido principal de ese sentido. */
  @Column({ name: 'variant_name', type: 'varchar', nullable: true })
  variantName: string | null;

  @Column({ name: 'start_name' })
  startName: string;

  @Column({ name: 'end_name' })
  endName: string;

  /** Polilínea del recorrido siguiendo las calles, en orden de avance. */
  @Column({ type: 'jsonb' })
  coordinates: LatLng[];

  @Index()
  @ManyToOne('RouteEntity', (route: RouteEntity) => route.paths, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route: RouteEntity;
}
