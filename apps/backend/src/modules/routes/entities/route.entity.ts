import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { VehicleType, RouteStatus } from '@collectigo/shared';
import type { StopEntity } from '../../stops/entities/stop.entity';
import type { RouteSuggestion } from './route-suggestion.entity';

@Entity('routes')
export class RouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['colectivo', 'auto', 'bus'] })
  type: VehicleType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fare: number;

  @Column({ default: '#3B82F6' })
  color: string;

  @Column({ type: 'enum', enum: ['active', 'inactive'], default: 'active' })
  status: RouteStatus;

  @Column({ type: 'text', nullable: true })
  polyline: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('StopEntity', (stop: StopEntity) => stop.route, { cascade: true, eager: true })
  stops: StopEntity[];

  @OneToMany('RouteSuggestion', (suggestion: RouteSuggestion) => suggestion.route)
  suggestions: RouteSuggestion[];
}
