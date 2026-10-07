import { ThrottlerException } from '@nestjs/throttler';
import type { Repository } from 'typeorm';
import type { MailService } from '../mail/mail.service';
import type { RouteEntity } from './entities/route.entity';
import type { RouteSuggestion } from './entities/route-suggestion.entity';
import { RoutesService } from './routes.service';
import { RouteSuggestionsService } from './route-suggestions.service';

describe('RouteSuggestionsService', () => {
  let routeRepository: { findOne: jest.Mock; find: jest.Mock };
  let suggestionRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let mailService: { sendRouteSuggestion: jest.Mock };
  let service: RouteSuggestionsService;

  const user = {
    uid: 'firebase-user-1',
    email: 'usuario@example.com',
    displayName: 'Usuario Prueba',
  };
  const dto = {
    type: 'fare' as const,
    description: 'La tarifa cambió recientemente',
  };

  beforeEach(() => {
    routeRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'route-1', name: 'TA-01' }),
      find: jest.fn(),
    };
    suggestionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    mailService = {
      sendRouteSuggestion: jest.fn().mockResolvedValue(undefined),
    };
    const routesService = new RoutesService(
      routeRepository as unknown as Repository<RouteEntity>,
      suggestionRepository as unknown as Repository<RouteSuggestion>,
    );
    service = new RouteSuggestionsService(
      routesService,
      mailService as unknown as MailService,
    );
  });

  it('envía una sugerencia autenticada por correo sin persistirla', async () => {
    await expect(service.sendSuggestion('route-1', dto, user)).resolves.toEqual(
      {
        success: true,
        message: 'Tu sugerencia fue enviada correctamente.',
      },
    );

    expect(mailService.sendRouteSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: user.displayName,
        userEmail: user.email,
        routeId: 'route-1',
        routeName: 'TA-01',
        suggestionType: 'Tarifa',
        description: dto.description,
      }),
    );
    expect(suggestionRepository.create).not.toHaveBeenCalled();
    expect(suggestionRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza un segundo envío durante el cooldown', async () => {
    await service.sendSuggestion('route-1', dto, user);

    await expect(
      service.sendSuggestion('route-1', dto, user),
    ).rejects.toBeInstanceOf(ThrottlerException);
    expect(mailService.sendRouteSuggestion).toHaveBeenCalledTimes(1);
  });

  it('rechaza un envío simultáneo del mismo usuario', async () => {
    let finishDelivery: (() => void) | undefined;
    mailService.sendRouteSuggestion.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishDelivery = resolve;
        }),
    );

    const first = service.sendSuggestion('route-1', dto, user);
    await Promise.resolve();
    await Promise.resolve();

    await expect(
      service.sendSuggestion('route-1', dto, user),
    ).rejects.toBeInstanceOf(ThrottlerException);
    finishDelivery?.();
    await expect(first).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
  });

  it('no registra cooldown si el servicio de correo falla', async () => {
    mailService.sendRouteSuggestion
      .mockRejectedValueOnce(new Error('proveedor no disponible'))
      .mockResolvedValueOnce(undefined);

    await expect(service.sendSuggestion('route-1', dto, user)).rejects.toThrow(
      'No pudimos enviar tu sugerencia en este momento. Inténtalo nuevamente.',
    );
    await expect(service.sendSuggestion('route-1', dto, user)).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
  });
});
