import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { VehicleType, RouteStatus } from '@collectigo/shared';
import type { FleetEntity } from './fleet.entity';
import type { RoutePathEntity } from './route-path.entity';
import type { RouteSuggestion } from './route-suggestion.entity';

/** El driver pg devuelve decimal como string; se normaliza a number. */
const decimalTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number => (value === null ? 0 : parseFloat(value)),
};

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Código de línea autorizado (ej. TA-11). */
  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['colectivo', 'auto', 'combi', 'bus'] })
  type: VehicleType;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  fare: number;

  @Column({ default: '#3B82F6' })
  color: string;

  @Index()
  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: RouteStatus;

  @Column({ name: 'start_terminal_name' })
  startTerminalName: string;

  @Column({ name: 'end_terminal_name' })
  endTerminalName: string;

  @Index()
  @ManyToOne('FleetEntity', (fleet: FleetEntity) => fleet.routes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'fleet_id' })
  fleet: FleetEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('RoutePathEntity', (path: RoutePathEntity) => path.route, { cascade: true })
  paths: RoutePathEntity[];

  @OneToMany('RouteSuggestion', (suggestion: RouteSuggestion) => suggestion.route)
  suggestions: RouteSuggestion[];
}
