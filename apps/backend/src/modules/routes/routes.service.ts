import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteEntity } from './entities/route.entity';
import { RouteSuggestion } from './entities/route-suggestion.entity';
import type { CreateSuggestionDto } from './dto/create-suggestion.dto';
import type { UpdateSuggestionStatusDto } from './dto/update-suggestion-status.dto';
import type { UserEntity } from '../users/entities/user.entity';
import type { SuggestionStatus } from '@collectigo/shared';

const ACTIVE_ROUTES_CACHE_TTL_MS = 60_000;

@Injectable()
export class RoutesService {
  private activeRoutesCache: { data: RouteEntity[]; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeRepository: Repository<RouteEntity>,
    @InjectRepository(RouteSuggestion)
    private readonly suggestionRepository: Repository<RouteSuggestion>,
  ) {}

  async findAll(): Promise<RouteEntity[]> {
    const now = Date.now();
    if (this.activeRoutesCache && this.activeRoutesCache.expiresAt > now) {
      return this.activeRoutesCache.data;
    }

    const routes = await this.routeRepository.find({
      where: { status: 'active' },
      relations: { paths: true, fleet: { company: true } },
      order: { name: 'ASC' },
    });

    this.activeRoutesCache = { data: routes, expiresAt: now + ACTIVE_ROUTES_CACHE_TTL_MS };
    return routes;
  }

  async findById(id: string): Promise<RouteEntity> {
    const route = await this.routeRepository.findOne({
      where: { id },
      relations: { paths: true, fleet: { company: true } },
    });
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

  async findSuggestionsByUser(userId: string): Promise<RouteSuggestion[]> {
    return this.suggestionRepository.find({
      where: { user: { id: userId } },
      relations: { route: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateSuggestionStatus(
    suggestionId: string,
    dto: UpdateSuggestionStatusDto,
  ): Promise<RouteSuggestion> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId },
      relations: { route: true, user: true },
    });

    if (!suggestion) {
      throw new NotFoundException(`Sugerencia con id ${suggestionId} no encontrada`);
    }

    if (suggestion.status !== 'pending') {
      throw new BadRequestException(
        `La sugerencia ya fue moderada (estado actual: ${suggestion.status})`,
      );
    }

    suggestion.status = dto.status as SuggestionStatus;
    return this.suggestionRepository.save(suggestion);
  }
}
