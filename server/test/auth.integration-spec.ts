/**
 * Integration tests for auth lifecycle.
 * Requires Postgres + Redis from docker compose (.env).
 * Skips automatically when dependencies are unavailable.
 */
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import cookieParser from 'cookie-parser';

const email = `gardener-${Date.now()}@example.com`;
const password = 'integration-pass-1';

describe('Auth integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let available = false;

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

  itDb('register → verify → login → me → refresh → logout', async () => {
    const server = app!.getHttpServer();

    await request(server)
      .post('/api/v1/auth/register')
      .send({ name: 'Тест', email, password })
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: email },
    });
    expect(user.emailVerifiedAt).toBeNull();

    const rawToken = randomBytes(32).toString('base64url');
    // Use the latest unused verification token from DB by injecting a known one.
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(server).post('/api/v1/auth/verify-email').send({ token: rawToken }).expect(200);

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password, clientType: 'mobile' })
      .expect(200);

    const accessToken = login.body.tokens.accessToken as string;
    const refreshToken = login.body.tokens.refreshToken as string;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe(email);
      });

    const refreshed = await request(server)
      .post('/api/v1/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken, clientType: 'mobile' })
      .expect(200);

    expect(refreshed.body.accessToken).toBeTruthy();

    await request(server)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
  });

  itDb('rejects login before email verification', async () => {
    const server = app!.getHttpServer();
    const pendingEmail = `pending-${Date.now()}@example.com`;

    await request(server)
      .post('/api/v1/auth/register')
      .send({ name: 'Pending', email: pendingEmail, password })
      .expect(201);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: pendingEmail, password, clientType: 'mobile' })
      .expect(403);
  });
});
