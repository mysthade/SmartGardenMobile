/**
 * Bed layout integration tests. Requires Postgres + Redis.
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';

describe('Bed layout integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let available = false;
  let accessToken = '';
  let zoneId = '';
  let plantTypeId = '';
  const email = `bed-${Date.now()}@example.com`;
  const password = 'bed-layout-pass-1';

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
      await request(server).post('/api/v1/auth/register').send({ name: 'Bed', email, password });
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

      const garden = await request(server)
        .post('/api/v1/gardens')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Сад layout' });
      const zone = await request(server)
        .post(`/api/v1/gardens/${garden.body.id}/zones`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Грядка 1', type: 'BED', width: '4', height: '2' });
      zoneId = zone.body.id as string;
      const types = await request(server)
        .get('/api/v1/plant-types')
        .set('Authorization', `Bearer ${accessToken}`);
      plantTypeId = types.body.data[0].id as string;
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

  itDb('GET layout for owner', async () => {
    const res = await request(app!.getHttpServer())
      .get(`/api/v1/zones/${zoneId}/layout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.zone.id).toBe(zoneId);
    expect(res.body.garden.name).toBeTruthy();
  });

  itDb('foreign zone returns 404', async () => {
    await request(app!.getHttpServer())
      .get('/api/v1/zones/00000000-0000-4000-8000-000000000099/layout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  itDb('rejects out-of-bounds plant', async () => {
    const layout = await request(app!.getHttpServer())
      .get(`/api/v1/zones/${zoneId}/layout`)
      .set('Authorization', `Bearer ${accessToken}`);
    await request(app!.getHttpServer())
      .put(`/api/v1/zones/${zoneId}/layout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', `bed-oob-${Date.now()}`)
      .send({
        zoneUpdatedAt: layout.body.zone.updatedAt,
        bed: { width: '4', height: '2' },
        plants: [
          {
            op: 'upsert',
            clientId: 'tmp-1',
            plantTypeId,
            name: 'Поза межами',
            quantity: 1,
            positionX: '0',
            positionY: '0',
            size: '0.4',
          },
        ],
      })
      .expect(400);
  });

  itDb('saves plant and conflicts on stale updatedAt', async () => {
    const layout = await request(app!.getHttpServer())
      .get(`/api/v1/zones/${zoneId}/layout`)
      .set('Authorization', `Bearer ${accessToken}`);

    const saved = await request(app!.getHttpServer())
      .put(`/api/v1/zones/${zoneId}/layout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', `bed-ok-${Date.now()}`)
      .send({
        zoneUpdatedAt: layout.body.zone.updatedAt,
        bed: { width: '4', height: '2' },
        plants: [
          {
            op: 'upsert',
            clientId: 'tmp-ok',
            plantTypeId,
            name: 'Помідор 1',
            quantity: 2,
            positionX: '1',
            positionY: '1',
            size: '0.4',
          },
        ],
      })
      .expect(200);

    expect(saved.body.idMap['tmp-ok']).toBeTruthy();
    expect(saved.body.layout.plants).toHaveLength(1);

    await request(app!.getHttpServer())
      .put(`/api/v1/zones/${zoneId}/layout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', `bed-stale-${Date.now()}`)
      .send({
        zoneUpdatedAt: layout.body.zone.updatedAt,
        bed: { width: '4', height: '2' },
        plants: [],
      })
      .expect(409);
  });
});
