import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { CompanyEntity } from './company.entity';
import type { RouteEntity } from './route.entity';

@Entity('fleets')
@Unique('UQ_fleets_company_number', ['company', 'number'])
export class FleetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Número de flota dentro de la empresa (ej. "135", "23"). */
  @Column()
  number: string;

  @Column({ name: 'vehicle_image_url', type: 'text', nullable: true })
  vehicleImageUrl: string | null;

  @Index()
  @ManyToOne('CompanyEntity', (company: CompanyEntity) => company.fleets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('RouteEntity', (route: RouteEntity) => route.fleet)
  routes: RouteEntity[];
}
