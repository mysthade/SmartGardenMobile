/**
 * Ownership IDOR checks for gardens/zones/plants.
 * Skips when Postgres/Redis are unavailable.
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

describe('Gardens ownership integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let passwords: PasswordService;
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

  async function createVerifiedUser(email: string): Promise<string> {
    const passwordHash = await passwords.hash('integration-pass-1');
    const user = await prisma.user.create({
      data: {
        name: 'Owner',
        email,
        normalizedEmail: email,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    return user.id;
  }

  async function login(email: string): Promise<string> {
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'integration-pass-1', clientType: 'mobile' })
      .expect(200);
    return res.body.tokens.accessToken as string;
  }

  itDb('owner can CRUD garden/zone/plant; stranger gets 404', async () => {
    const server = app!.getHttpServer();
    const ownerEmail = `owner-${Date.now()}@example.com`;
    const strangerEmail = `stranger-${Date.now()}@example.com`;
    await createVerifiedUser(ownerEmail);
    await createVerifiedUser(strangerEmail);

    const ownerToken = await login(ownerEmail);
    const strangerToken = await login(strangerEmail);

    const plantType = await prisma.plantType.findFirstOrThrow();

    const gardenRes = await request(server)
      .post('/api/v1/gardens')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Мій сад', area: '10' })
      .expect(201);

    const gardenId = gardenRes.body.id as string;

    await request(server)
      .get(`/api/v1/gardens/${gardenId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    const zoneRes = await request(server)
      .post(`/api/v1/gardens/${gardenId}/zones`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Грядка 1', type: 'BED' })
      .expect(201);

    const zoneId = zoneRes.body.id as string;

    await request(server)
      .get(`/api/v1/zones/${zoneId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    const plantRes = await request(server)
      .post(`/api/v1/zones/${zoneId}/plants`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Idempotency-Key', `own-plant-${Date.now()}`)
      .send({
        plantTypeId: plantType.id,
        name: 'Помідор',
        status: 'PLANTED',
      })
      .expect(201);

    const plantId = plantRes.body.id as string;

    await request(server)
      .get(`/api/v1/plants/${plantId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    await request(server)
      .get(`/api/v1/plants/${randomUUID()}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);

    await request(server)
      .patch(`/api/v1/plants/${plantId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Помідор оновлений', version: 1 })
      .expect(200)
      .expect((res) => {
        expect(res.body.version).toBe(2);
        expect(res.body.name).toBe('Помідор оновлений');
      });

    await request(server)
      .patch(`/api/v1/plants/${plantId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Старе', version: 1 })
      .expect(409);
  });
});
