import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { SuggestionType } from '@collectigo/shared';
import { MailService } from '../mail/mail.service';
import { RoutesService } from './routes.service';
import type { CreateSuggestionDto } from './dto/create-suggestion.dto';

const USER_COOLDOWN_MS = 60_000;
const COOLDOWN_MESSAGE = 'Espera un momento antes de enviar otra sugerencia.';
const DELIVERY_ERROR =
  'No pudimos enviar tu sugerencia en este momento. Inténtalo nuevamente.';

const TYPE_LABEL: Record<SuggestionType, string> = {
  stop_position: 'Posición de parada',
  route_path: 'Recorrido',
  fare: 'Tarifa',
  schedule: 'Horario',
  other: 'Otro',
};

export interface AuthenticatedSuggestionUser {
  uid: string;
  email: string;
  displayName: string;
}

export interface SuggestionDeliveryResponse {
  success: true;
  message: string;
}

@Injectable()
export class RouteSuggestionsService {
  private readonly inFlightUsers = new Set<string>();
  private readonly lastSentAtByUser = new Map<string, number>();

  constructor(
    private readonly routesService: RoutesService,
    private readonly mailService: MailService,
  ) {}

  async sendSuggestion(
    routeId: string,
    dto: CreateSuggestionDto,
    user: AuthenticatedSuggestionUser,
  ): Promise<SuggestionDeliveryResponse> {
    const now = Date.now();
    const lastSentAt = this.lastSentAtByUser.get(user.uid);
    if (
      this.inFlightUsers.has(user.uid) ||
      (lastSentAt !== undefined && now - lastSentAt < USER_COOLDOWN_MS)
    ) {
      throw new ThrottlerException(COOLDOWN_MESSAGE);
    }

    this.inFlightUsers.add(user.uid);
    try {
      const route = await this.routesService.findById(routeId);
      try {
        await this.mailService.sendRouteSuggestion({
          userName: user.displayName,
          userEmail: user.email,
          routeId: route.id,
          routeName: route.name,
          suggestionType: TYPE_LABEL[dto.type],
          description: dto.description,
          submittedAt: new Date(now),
        });
      } catch {
        throw new ServiceUnavailableException(DELIVERY_ERROR);
      }
      this.lastSentAtByUser.set(user.uid, now);
      return {
        success: true,
        message: 'Tu sugerencia fue enviada correctamente.',
      };
    } finally {
      this.inFlightUsers.delete(user.uid);
      this.pruneExpiredCooldowns(now);
    }
  }

  private pruneExpiredCooldowns(now: number): void {
    if (this.lastSentAtByUser.size < 1_000) return;
    for (const [userId, sentAt] of this.lastSentAtByUser) {
      if (now - sentAt >= USER_COOLDOWN_MS)
        this.lastSentAtByUser.delete(userId);
    }
  }
}
