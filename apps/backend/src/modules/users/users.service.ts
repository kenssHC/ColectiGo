import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import type { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createOrFind(dto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({
      where: { firebaseUid: dto.firebaseUid },
    });

    if (existing) {
      return existing;
    }

    const emailTaken = await this.userRepository.findOne({ where: { email: dto.email } });
    if (emailTaken) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
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
}
