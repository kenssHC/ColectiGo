import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleTokenVerifierService } from './google-token-verifier.service';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('GoogleTokenVerifierService', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  function createService(clientId = 'web-client.apps.googleusercontent.com') {
    return new GoogleTokenVerifierService(
      new ConfigService({ googleAuth: { webClientId: clientId } }),
    );
  }

  it('acepta un token válido y usa sub como identificador estable', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-1',
        email: 'Usuario@Gmail.com',
        email_verified: true,
        name: 'Usuario Google',
        picture: 'https://example.com/avatar.png',
      }),
    });

    await expect(createService().verify('valid-token')).resolves.toEqual({
      subject: 'google-sub-1',
      email: 'usuario@gmail.com',
      name: 'Usuario Google',
      picture: 'https://example.com/avatar.png',
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'valid-token',
      audience: 'web-client.apps.googleusercontent.com',
    });
  });

  it.each(['token expirado', 'audience incorrecta', 'token falso'])(
    'rechaza %s cuando la librería oficial falla',
    async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('invalid token'));
      await expect(
        createService().verify('invalid-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rechaza correos no verificados', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-1',
        email: 'usuario@gmail.com',
        email_verified: false,
      }),
    });

    await expect(createService().verify('unverified')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('falla de forma explícita cuando falta la configuración del servidor', async () => {
    await expect(createService('').verify('token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});
