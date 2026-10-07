import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoutesService } from './routes.service';
import type { Repository } from 'typeorm';
import type { RouteEntity } from './entities/route.entity';
import type { RouteSuggestion } from './entities/route-suggestion.entity';

describe('RoutesService', () => {
  let routeRepository: jest.Mocked<
    Pick<Repository<RouteEntity>, 'find' | 'findOne'>
  >;
  let suggestionRepository: jest.Mocked<
    Pick<Repository<RouteSuggestion>, 'find' | 'findOne' | 'save'>
  >;
  let service: RoutesService;

  beforeEach(() => {
    routeRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    suggestionRepository = {
      save: jest.fn(),
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
    } as RouteSuggestion;
    suggestionRepository.findOne.mockResolvedValueOnce(suggestion);
    suggestionRepository.save.mockResolvedValueOnce(suggestion);

    const result = await service.updateSuggestionStatus('sug-1', {
      status: 'approved',
    });

    expect(result.status).toBe('approved');
  });

  it('updateSuggestionStatus rechaza si ya fue moderada', async () => {
    suggestionRepository.findOne.mockResolvedValueOnce({
      id: 'sug-1',
      status: 'approved',
    } as RouteSuggestion);

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
});
