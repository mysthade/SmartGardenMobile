/**
 * Stage 5 diary loop + attachment rejection checks.
 * Skips when Postgres/Redis unavailable.
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Events & attachments integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let passwords: PasswordService;
  let available = false;

  beforeAll(async () => {
    try {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1', { exclude: ['health/live', 'health/ready'] });
      app.use(
        cookieParser(process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-me-32-characters!'),
      );
      await app.init();
      prisma = app.get(PrismaService);
      passwords = app.get(PasswordService);
      const redis = app.get(RedisService);
      available = (await prisma.isHealthy()) && (await redis.isHealthy());
    } catch {
      available = false;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const itDb = (name: string, fn: () => Promise<void>) => {
    it(name, async () => {
      if (!available || !app) {
        return;
      }
      await fn();
    });
  };

  async function bootstrapPlant(): Promise<{ token: string; plantId: string }> {
    const email = `events-${Date.now()}@example.com`;
    const passwordHash = await passwords.hash('integration-pass-1');
    await prisma.user.create({
      data: {
        name: 'Events',
        email,
        normalizedEmail: email,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    const login = await request(app!.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'integration-pass-1', clientType: 'mobile' })
      .expect(200);
    const token = login.body.tokens.accessToken as string;

    const plantType = await prisma.plantType.findFirstOrThrow();
    const garden = await request(app!.getHttpServer())
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Сад' })
      .expect(201);
    const zone = await request(app!.getHttpServer())
      .post(`/api/v1/gardens/${garden.body.id}/zones`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Зона', type: 'BED' })
      .expect(201);
    const plant = await request(app!.getHttpServer())
      .post(`/api/v1/zones/${zone.body.id}/plants`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `plant-${randomUUID()}`)
      .send({ plantTypeId: plantType.id, name: 'Томат' })
      .expect(201);

    return { token, plantId: plant.body.id as string };
  }

  itDb('journal → harvest → problem → care → task loop', async () => {
    const server = app!.getHttpServer();
    const { token, plantId } = await bootstrapPlant();

    await request(server)
      .post(`/api/v1/plants/${plantId}/journal`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `journal-${randomUUID()}`)
      .send({
        title: 'Перший огляд',
        observedAt: new Date().toISOString(),
        type: 'OBSERVATION',
      })
      .expect(201);

    const harvest = await request(server)
      .post(`/api/v1/plants/${plantId}/harvests`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `harvest-${randomUUID()}`)
      .send({
        harvestedAt: new Date().toISOString(),
        quantity: '1.2',
        unit: 'KILOGRAM',
      })
      .expect(201);
    expect(harvest.body.quantityGrams).toBe('1200');

    const problem = await request(server)
      .post(`/api/v1/plants/${plantId}/problems`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `problem-${randomUUID()}`)
      .send({
        title: 'Попелиця',
        detectedAt: new Date().toISOString(),
        severity: 'HIGH',
      })
      .expect(201);

    const plant = await request(server)
      .get(`/api/v1/plants/${plantId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(plant.body.status).toBe('HAS_PROBLEM');

    await request(server)
      .post(`/api/v1/plants/${plantId}/care-activities`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `care-${randomUUID()}`)
      .send({
        type: 'PEST_TREATMENT',
        performedAt: new Date().toISOString(),
      })
      .expect(201);

    await request(server)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `task-${randomUUID()}`)
      .send({ title: 'Повторити обробку', plantId })
      .expect(201);

    await request(server)
      .patch(`/api/v1/problems/${problem.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'RESOLVED', solution: 'Обробка зроблена' })
      .expect(200);
  });

  itDb('rejects oversized and svg upload-url requests', async () => {
    const server = app!.getHttpServer();
    const { token, plantId } = await bootstrapPlant();

    await request(server)
      .post('/api/v1/attachments/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `up-big-${randomUUID()}`)
      .send({
        originalFileName: 'huge.jpg',
        mimeType: 'image/jpeg',
        size: 11 * 1024 * 1024,
        plantId,
      })
      .expect(400);

    await request(server)
      .post('/api/v1/attachments/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `up-svg-${randomUUID()}`)
      .send({
        originalFileName: 'x.svg',
        mimeType: 'image/svg+xml',
        size: 100,
        plantId,
      })
      .expect(400);
  });
});
