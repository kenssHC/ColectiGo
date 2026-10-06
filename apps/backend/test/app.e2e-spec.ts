import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { PlannerController } from '../src/modules/planner/planner.controller';
import { PlannerService } from '../src/modules/planner/planner.service';

describe('API (e2e ligero)', () => {
  let app: INestApplication;

  const plannerService = {
    calculate: jest.fn().mockResolvedValue({
      best: { steps: [], totalDistance: 0, totalDuration: 0, totalFare: 0 },
      alternatives: [],
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, PlannerController],
      providers: [{ provide: PlannerService, useValue: plannerService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    plannerService.calculate.mockClear();
  });

  it('GET /api/v1/health responde ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('POST /api/v1/planner/calculate valida lat/lng', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/planner/calculate')
      .send({ origin: { lat: 999, lng: 0 }, destination: { lat: 0, lng: 0 } })
      .expect(400);

    expect(plannerService.calculate).not.toHaveBeenCalled();
  });

  it('POST /api/v1/planner/calculate delega al servicio con coordenadas válidas', async () => {
    const body = {
      origin: { lat: -12.0651, lng: -75.2049 },
      destination: { lat: -12.08, lng: -75.21 },
    };

    await request(app.getHttpServer()).post('/api/v1/planner/calculate').send(body).expect(200);

    expect(plannerService.calculate).toHaveBeenCalledWith(body.origin, body.destination);
  });
});
