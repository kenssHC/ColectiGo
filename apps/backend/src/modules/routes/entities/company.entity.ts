import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FleetEntity } from './fleet.entity';

@Entity('companies')
export class CompanyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** Código único de empresa asignado por la autoridad (ej. TR-0024). */
  @Column({ unique: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('FleetEntity', (fleet: FleetEntity) => fleet.company)
  fleets: FleetEntity[];
}
