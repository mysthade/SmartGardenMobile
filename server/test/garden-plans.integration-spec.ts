/**
 * Garden plans integration tests. Requires Postgres + Redis.
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Garden plans integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let available = false;
  let accessToken = '';
  let foreignAccessToken = '';
  let gardenId = '';
  const email = `planner-${Date.now()}@example.com`;
  const foreignEmail = `foreign-planner-${Date.now()}@example.com`;
  const password = 'planner-test-pass-1';

  beforeAll(async () => {
    try {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1', {
        exclude: ['health/live', 'health/ready'],
      });
      app.use(
        cookieParser(process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-me-32-characters!'),
      );
      await app.init();

      prisma = app.get(PrismaService);
      const redis = app.get(RedisService);
      available = (await prisma.isHealthy()) && (await redis.isHealthy());
      if (!available || !app) {
        return;
      }

      const server = app.getHttpServer();

      // Register & login user 1
      await request(server).post('/api/v1/auth/register').send({ name: 'Planner User', email, password });
      const user = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: email } });
      const rawToken = randomBytes(32).toString('base64url');
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(rawToken).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await request(server).post('/api/v1/auth/verify-email').send({ token: rawToken });
      const login = await request(server)
        .post('/api/v1/auth/login')
        .send({ email, password, clientType: 'mobile' });
      accessToken = login.body.tokens.accessToken as string;

      // Register & login foreign user
      await request(server).post('/api/v1/auth/register').send({ name: 'Foreign User', email: foreignEmail, password });
      const foreignUser = await prisma.user.findUniqueOrThrow({ where: { normalizedEmail: foreignEmail } });
      const foreignRawToken = randomBytes(32).toString('base64url');
      await prisma.emailVerificationToken.create({
        data: {
          userId: foreignUser.id,
          tokenHash: createHash('sha256').update(foreignRawToken).digest('hex'),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await request(server).post('/api/v1/auth/verify-email').send({ token: foreignRawToken });
      const foreignLogin = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: foreignEmail, password, clientType: 'mobile' });
      foreignAccessToken = foreignLogin.body.tokens.accessToken as string;

      // Create garden
      const garden = await request(server)
        .post('/api/v1/gardens')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Сад для планування', mapWidth: '50.0', mapHeight: '50.0' });
      gardenId = garden.body.id as string;
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

  let activePlanId = '';

  itDb('GET /gardens/:gardenId/plans/active auto-creates and returns active plan', async () => {
    const res = await request(app!.getHttpServer())
      .get(`/api/v1/gardens/${gardenId}/plans/active`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body.gardenId).toBe(gardenId);
    expect(res.body.widthCm).toBe(5000);
    expect(res.body.heightCm).toBe(5000);
    expect(res.body.isActive).toBe(true);
    expect(res.body.version).toBe(1);
    expect(Array.isArray(res.body.objects)).toBe(true);
    activePlanId = res.body.id as string;
  });

  itDb('PUT /plans/:planId/objects batch upserts objects and increments version', async () => {
    const res = await request(app!.getHttpServer())
      .put(`/api/v1/plans/${activePlanId}/objects`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1,
        objects: [
          {
            clientId: 'temp-gazebo-1',
            type: 'GAZEBO',
            label: 'Альтанка біля ставка',
            xCm: 500,
            yCm: 600,
            widthCm: 300,
            heightCm: 300,
            layer: 'BUILDINGS',
            color: '#d97706',
          },
          {
            clientId: 'temp-bbq-1',
            type: 'BBQ',
            label: 'Мангал',
            xCm: 900,
            yCm: 600,
            widthCm: 100,
            heightCm: 60,
            layer: 'UTILITIES',
          },
        ],
      })
      .expect(200);

    expect(res.body).toHaveProperty('plan');
    expect(res.body.plan.version).toBe(2);
    expect(res.body.plan.objects).toHaveLength(2);
    expect(res.body.idMap).toHaveProperty('temp-gazebo-1');
    expect(res.body.idMap).toHaveProperty('temp-bbq-1');
  });

  itDb('PUT /plans/:planId/objects rejects with 409 Conflict if version is stale', async () => {
    await request(app!.getHttpServer())
      .put(`/api/v1/plans/${activePlanId}/objects`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        version: 1, // Stale version (current is 2)
        objects: [],
      })
      .expect(409);
  });

  itDb('POST /plans/:planId/duplicate copies plan and objects with version 1', async () => {
    const res = await request(app!.getHttpServer())
      .post(`/api/v1/plans/${activePlanId}/duplicate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Варіант Б' })
      .expect(201);

    expect(res.body.name).toBe('Варіант Б');
    expect(res.body.version).toBe(1);
    expect(res.body.id).not.toBe(activePlanId);
    expect(res.body.objects).toHaveLength(2);
  });

  itDb('Foreign user cannot access plan (returns 404)', async () => {
    await request(app!.getHttpServer())
      .get(`/api/v1/plans/${activePlanId}`)
      .set('Authorization', `Bearer ${foreignAccessToken}`)
      .expect(404);
  });
});
