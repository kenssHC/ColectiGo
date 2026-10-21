import { UnauthorizedException } from '@nestjs/common';
import { UsersController } from './users.controller';
import type { UsersService } from './users.service';
import type { FirebaseAuthPayload } from '../auth/interfaces/firebase-auth-payload.interface';

describe('UsersController', () => {
  const nowSeconds = 1_800_000_000;
  let usersService: { deleteAccount: jest.Mock };
  let controller: UsersController;

  const payload = (authTime: number): FirebaseAuthPayload => ({
    uid: 'uid-1',
    email: 'user@example.test',
    name: 'Usuario',
    isAdmin: false,
    signInProvider: 'password',
    authTime,
  });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(nowSeconds * 1000);
    usersService = { deleteAccount: jest.fn().mockResolvedValue(undefined) };
    controller = new UsersController(usersService as unknown as UsersService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('elimina la cuenta con autenticación reciente', async () => {
    await controller.deleteMe(payload(nowSeconds - 60));

    expect(usersService.deleteAccount).toHaveBeenCalledWith('uid-1');
  });

  it('exige volver a iniciar sesión si la autenticación tiene más de cinco minutos', async () => {
    await expect(
      controller.deleteMe(payload(nowSeconds - 301)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.deleteAccount).not.toHaveBeenCalled();
  });
});
