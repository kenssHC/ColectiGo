import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { RouteEntity } from '../../routes/entities/route.entity';

@Entity('stops')
export class StopEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  order: number;

  @Column({ type: 'double precision' })
  lat: number;

  @Column({ type: 'double precision' })
  lng: number;

  @ManyToOne('RouteEntity', (route: RouteEntity) => route.stops, { onDelete: 'CASCADE' })
  route: RouteEntity;
}
