import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { FirebaseAuthPayload } from '../../modules/auth/interfaces/firebase-auth-payload.interface';

/**
 * Requiere que FirebaseAuthGuard se haya ejecutado antes (request.user poblado).
 * El rol admin se asigna con custom claims de Firebase: { admin: true }.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: FirebaseAuthPayload }>();

    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Se requieren permisos de administrador');
    }

    return true;
  }
}
