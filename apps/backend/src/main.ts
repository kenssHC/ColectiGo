import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const corsOrigins = config.get<string>('app.corsOrigins') ?? '*';
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((o) => o.trim()),
  });

  app.setGlobalPrefix('api/v1');

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);
}

bootstrap();
