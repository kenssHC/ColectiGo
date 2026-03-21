import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { SuggestionStatus, SuggestionType } from '@collectigo/shared';
import type { UserEntity } from '../../users/entities/user.entity';
import type { RouteEntity } from './route.entity';

@Entity('route_suggestions')
export class RouteSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['stop_position', 'route_path', 'fare', 'schedule', 'other'] })
  type: SuggestionType;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: SuggestionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne('UserEntity', (user: UserEntity) => user.suggestions)
  user: UserEntity;

  @ManyToOne('RouteEntity', (route: RouteEntity) => route.suggestions)
  route: RouteEntity;
}
