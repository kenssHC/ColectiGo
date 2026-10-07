import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { SendMailOptions } from 'nodemailer';
import { MailService } from './mail.service';
import type { MailTransport, RouteSuggestionMail } from './mail.types';

const input: RouteSuggestionMail = {
  userName: 'Juan <script>alert(1)</script>',
  userEmail: 'juan@example.com',
  routeId: 'route-1',
  routeName: 'TA-01',
  suggestionType: 'Tarifa',
  description: 'La tarifa debería actualizarse.\nGracias.',
  submittedAt: new Date('2026-10-06T23:40:00.000Z'),
};

describe('MailService', () => {
  let values: Record<string, unknown>;
  let transport: { sendMail: jest.Mock<Promise<unknown>, [SendMailOptions]> };
  let service: MailService;

  beforeEach(() => {
    values = {
      'mail.host': 'smtp.example.com',
      'mail.from': 'ColectiGO <no-reply@example.com>',
      'mail.routeSuggestionsEmail': 'admin@example.com',
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    const sendMail = jest.fn<Promise<unknown>, [SendMailOptions]>();
    sendMail.mockResolvedValue({ messageId: 'mail-1' });
    transport = { sendMail };
    service = new MailService(config, transport as MailTransport);
  });

  it('obtiene el destinatario de configuración y envía texto más HTML sanitizado', async () => {
    await service.sendRouteSuggestion(input);

    expect(transport.sendMail).toHaveBeenCalledTimes(1);
    const options = transport.sendMail.mock.calls[0][0];
    expect(options.to).toBe('admin@example.com');
    expect(options.replyTo).toBe(input.userEmail);
    expect(options.subject).toBe('[ColectiGO] Nueva sugerencia de ruta');
    expect(options.text).toContain(input.description);
    expect(options.html).toContain('&lt;script&gt;');
    expect(options.html).not.toContain('<script>');
    expect(JSON.stringify(options)).not.toContain('SMTP_PASSWORD');
  });

  it('falla de forma controlada cuando falta configuración', async () => {
    values['mail.routeSuggestionsEmail'] = '';

    await expect(service.sendRouteSuggestion(input)).rejects.toThrow(
      'No pudimos enviar tu sugerencia en este momento. Inténtalo nuevamente.',
    );
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it('no expone el error interno del proveedor', async () => {
    transport.sendMail.mockRejectedValueOnce(
      new Error('SMTP 535 API key invalid'),
    );

    const promise = service.sendRouteSuggestion(input);
    await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(promise).rejects.not.toThrow('SMTP 535');
  });
});
