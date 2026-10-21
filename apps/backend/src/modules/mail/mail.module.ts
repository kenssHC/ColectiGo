import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MAIL_TRANSPORT } from './mail.constants';
import { MailService } from './mail.service';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService,
      ): ReturnType<typeof nodemailer.createTransport> => {
        const user = config.get<string>('mail.user') ?? '';
        const password = config.get<string>('mail.password') ?? '';
        return nodemailer.createTransport({
          host: config.get<string>('mail.host') || 'localhost',
          port: config.get<number>('mail.port') ?? 587,
          secure: config.get<boolean>('mail.secure') ?? false,
          requireTLS: config.get<boolean>('mail.requireTls') ?? true,
          ...(user && password ? { auth: { user, pass: password } } : {}),
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
          tls: { minVersion: 'TLSv1.2' },
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
