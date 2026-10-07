import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteEntity } from './entities/route.entity';

const ACTIVE_ROUTES_CACHE_TTL_MS = 60_000;

@Injectable()
export class RoutesService {
  private activeRoutesCache: { data: RouteEntity[]; expiresAt: number } | null =
    null;

  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeRepository: Repository<RouteEntity>,
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

    this.activeRoutesCache = {
      data: routes,
      expiresAt: now + ACTIVE_ROUTES_CACHE_TTL_MS,
    };
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
}
