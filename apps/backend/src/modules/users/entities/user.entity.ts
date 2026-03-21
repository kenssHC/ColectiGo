import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { RouteSuggestion } from '../../../modules/routes/entities/route-suggestion.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'firebase_uid' })
  firebaseUid: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ unique: true })
  email: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('RouteSuggestion', (suggestion: RouteSuggestion) => suggestion.user)
  suggestions: RouteSuggestion[];
}
