import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import type { CreateUserDto } from './dto/create-user.dto';
import type { AuthMethod } from '@collectigo/shared';
import { AuthIdentityEntity } from '../auth/entities/auth-identity.entity';
import { AuthService } from '../auth/auth.service';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code ===
      PG_UNIQUE_VIOLATION
  );
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthIdentityEntity)
    private readonly identityRepository: Repository<AuthIdentityEntity>,
    private readonly authService: AuthService,
  ) {}

  async createOrFind(dto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({
      where: { firebaseUid: dto.firebaseUid },
    });

    if (existing) {
      return existing;
    }

    try {
      const user = this.userRepository.create(dto);
      return await this.userRepository.save(user);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      // Carrera: otro request creó el usuario entre el findOne y el save.
      const concurrent = await this.userRepository.findOne({
        where: { firebaseUid: dto.firebaseUid },
      });
      if (concurrent) {
        return concurrent;
      }
      throw new ConflictException('El correo ya está registrado');
    }
  }

  async findByFirebaseUid(firebaseUid: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async getProfile(firebaseUid: string) {
    const user = await this.findByFirebaseUid(firebaseUid);
    const [identities, firebaseUser] = await Promise.all([
      this.identityRepository.find({ where: { userId: user.id } }),
      this.authService.findUserByUid(firebaseUid),
    ]);
    const authMethods = new Set<AuthMethod>();

    if (
      firebaseUser?.providerData.some(
        (provider) => provider.providerId === 'password',
      )
    ) {
      authMethods.add('password');
    }
    if (
      firebaseUser?.providerData.some(
        (provider) => provider.providerId === 'google.com',
      ) ||
      identities.some((identity) => identity.provider === 'google')
    ) {
      authMethods.add('google');
    }

    return {
      ...user,
      authMethods: [...authMethods],
      avatarUrl: firebaseUser?.photoURL ?? null,
      emailVerified: firebaseUser?.emailVerified ?? false,
    };
  }
}
