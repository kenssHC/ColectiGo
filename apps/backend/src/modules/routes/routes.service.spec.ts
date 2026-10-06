import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoutesService } from './routes.service';
import type { Repository } from 'typeorm';
import type { RouteEntity } from './entities/route.entity';
import type { RouteSuggestion } from './entities/route-suggestion.entity';
import type { UserEntity } from '../users/entities/user.entity';

describe('RoutesService', () => {
  let routeRepository: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock };
  let suggestionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let service: RoutesService;

  beforeEach(() => {
    routeRepository = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    suggestionRepository = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    service = new RoutesService(
      routeRepository as unknown as Repository<RouteEntity>,
      suggestionRepository as unknown as Repository<RouteSuggestion>,
    );
  });

  it('updateSuggestionStatus aprueba una sugerencia pendiente', async () => {
    const suggestion = {
      id: 'sug-1',
      status: 'pending',
      route: { id: 'r1' },
      user: { id: 'u1' },
    };
    suggestionRepository.findOne.mockResolvedValueOnce(suggestion);
    suggestionRepository.save.mockImplementation(async (v) => v);

    const result = await service.updateSuggestionStatus('sug-1', { status: 'approved' });

    expect(result.status).toBe('approved');
  });

  it('updateSuggestionStatus rechaza si ya fue moderada', async () => {
    suggestionRepository.findOne.mockResolvedValueOnce({
      id: 'sug-1',
      status: 'approved',
    });

    await expect(
      service.updateSuggestionStatus('sug-1', { status: 'rejected' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateSuggestionStatus lanza NotFound si no existe', async () => {
    suggestionRepository.findOne.mockResolvedValueOnce(null);

    await expect(
      service.updateSuggestionStatus('sug-x', { status: 'approved' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createSuggestion asocia ruta y usuario', async () => {
    const route = { id: 'route-1', stops: [] } as unknown as RouteEntity;
    const user = { id: 'user-1' } as UserEntity;
    routeRepository.findOne.mockResolvedValueOnce(route);

    await service.createSuggestion(
      'route-1',
      { type: 'fare', description: 'Tarifa incorrecta' },
      user,
    );

    expect(suggestionRepository.create).toHaveBeenCalledWith({
      type: 'fare',
      description: 'Tarifa incorrecta',
      route,
      user,
    });
  });
});
