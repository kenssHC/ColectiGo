import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { FirebaseAuthPayload } from '../../modules/auth/interfaces/firebase-auth-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FirebaseAuthPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: FirebaseAuthPayload }>();
    return request.user;
  },
);
