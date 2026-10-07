import { GUARDS_METADATA } from '@nestjs/common/constants';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RoutesController } from './routes.controller';

describe('RoutesController', () => {
  it('protege el envío de sugerencias con autenticación Firebase', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      RoutesController.prototype,
      'suggest',
    );
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      descriptor?.value as object,
    ) as unknown[];

    expect(guards).toContain(FirebaseAuthGuard);
  });
});
