import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT } from './mail.constants';
import type { MailTransport, RouteSuggestionMail } from './mail.types';

const DELIVERY_ERROR =
  'No pudimos enviar tu sugerencia en este momento. Inténtalo nuevamente.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  async sendRouteSuggestion(input: RouteSuggestionMail): Promise<void> {
    const host = this.config.get<string>('mail.host')?.trim();
    const from = this.config.get<string>('mail.from')?.trim();
    const recipient = this.config
      .get<string>('mail.routeSuggestionsEmail')
      ?.trim();

    if (!host || !from || !recipient) {
      this.logger.warn('El correo de sugerencias no está configurado');
      throw new ServiceUnavailableException(DELIVERY_ERROR);
    }

    const submittedAt = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Lima',
    }).format(input.submittedAt);
    const text = [
      'Se recibió una nueva sugerencia de ruta desde ColectiGO.',
      '',
      `Usuario: ${input.userName}`,
      `Correo: ${input.userEmail}`,
      `Ruta: ${input.routeName} (${input.routeId})`,
      `Tipo: ${input.suggestionType}`,
      `Fecha: ${submittedAt}`,
      '',
      'Sugerencia:',
      input.description,
    ].join('\n');
    const html = `
      <h2>Nueva sugerencia de ruta</h2>
      <p>Se recibió una nueva sugerencia desde ColectiGO.</p>
      <dl>
        <dt><strong>Usuario</strong></dt><dd>${escapeHtml(input.userName)}</dd>
        <dt><strong>Correo</strong></dt><dd>${escapeHtml(input.userEmail)}</dd>
        <dt><strong>Ruta</strong></dt><dd>${escapeHtml(input.routeName)} (${escapeHtml(input.routeId)})</dd>
        <dt><strong>Tipo</strong></dt><dd>${escapeHtml(input.suggestionType)}</dd>
        <dt><strong>Fecha</strong></dt><dd>${escapeHtml(submittedAt)}</dd>
      </dl>
      <h3>Sugerencia</h3>
      <p>${escapeHtml(input.description).replace(/\n/g, '<br>')}</p>
    `.trim();

    try {
      await this.transport.sendMail({
        from,
        to: recipient,
        replyTo: input.userEmail,
        subject: '[ColectiGO] Nueva sugerencia de ruta',
        text,
        html,
      });
    } catch {
      this.logger.error('Falló el envío de una sugerencia de ruta');
      throw new ServiceUnavailableException(DELIVERY_ERROR);
    }
  }
}
