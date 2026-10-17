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
import { UserEntity } from '../../users/entities/user.entity';

export const AUTH_PROVIDER_GOOGLE = 'google' as const;
export type AuthProvider = typeof AUTH_PROVIDER_GOOGLE;

@Entity('auth_identities')
@Index('UQ_auth_identities_provider_user', ['provider', 'providerUserId'], {
  unique: true,
})
@Index('UQ_auth_identities_user_provider', ['userId', 'provider'], {
  unique: true,
})
export class AuthIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  provider: AuthProvider;

  @Column({ name: 'provider_user_id' })
  providerUserId: string;

  @Column({ name: 'provider_email', type: 'varchar', nullable: true })
  providerEmail: string | null;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
