import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
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

  @Index()
  @ManyToOne('UserEntity', (user: UserEntity) => user.suggestions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Index()
  @ManyToOne('RouteEntity', (route: RouteEntity) => route.suggestions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route: RouteEntity;
}
