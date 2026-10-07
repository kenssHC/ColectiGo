import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { RouteEntity } from './entities/route.entity';
import { RoutesService } from './routes.service';

describe('RoutesService', () => {
  let routeRepository: jest.Mocked<
    Pick<Repository<RouteEntity>, 'find' | 'findOne'>
  >;
  let service: RoutesService;

  beforeEach(() => {
    routeRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    service = new RoutesService(
      routeRepository as unknown as Repository<RouteEntity>,
    );
  });

  it('devuelve una ruta existente', async () => {
    const route = { id: 'route-1', name: 'TA-01' } as RouteEntity;
    routeRepository.findOne.mockResolvedValueOnce(route);

    await expect(service.findById(route.id)).resolves.toBe(route);
  });

  it('rechaza un identificador inexistente', async () => {
    routeRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
