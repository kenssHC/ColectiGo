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
      useFactory: (config: ConfigService) => {
        const user = config.get<string>('mail.user') ?? '';
        const password = config.get<string>('mail.password') ?? '';
        return nodemailer.createTransport({
          host: config.get<string>('mail.host') || 'localhost',
          port: config.get<number>('mail.port') ?? 587,
          secure: config.get<boolean>('mail.secure') ?? false,
          ...(user && password ? { auth: { user, pass: password } } : {}),
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
