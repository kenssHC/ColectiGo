import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteEntity } from './entities/route.entity';
import { RouteSuggestion } from './entities/route-suggestion.entity';
import type { CreateRouteDto } from './dto/create-route.dto';
import type { CreateSuggestionDto } from './dto/create-suggestion.dto';
import type { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeRepository: Repository<RouteEntity>,
    @InjectRepository(RouteSuggestion)
    private readonly suggestionRepository: Repository<RouteSuggestion>,
  ) {}

  async create(dto: CreateRouteDto): Promise<RouteEntity> {
    const route = this.routeRepository.create(dto);
    return this.routeRepository.save(route);
  }

  async findAll(): Promise<RouteEntity[]> {
    return this.routeRepository.find({ where: { status: 'active' } });
  }

  async findById(id: string): Promise<RouteEntity> {
    const route = await this.routeRepository.findOne({ where: { id } });
    if (!route) {
      throw new NotFoundException(`Ruta con id ${id} no encontrada`);
    }
    return route;
  }

  async createSuggestion(
    routeId: string,
    dto: CreateSuggestionDto,
    user: UserEntity,
  ): Promise<RouteSuggestion> {
    const route = await this.findById(routeId);
    const suggestion = this.suggestionRepository.create({
      ...dto,
      route,
      user,
    });
    return this.suggestionRepository.save(suggestion);
  }
}
