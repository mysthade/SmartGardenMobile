import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  find(userId: string, key: string) {
    return this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
  }

  begin(userId: string, key: string, route: string, requestHash: string, ttlSeconds: number) {
    return this.prisma.idempotencyKey.create({
      data: {
        userId,
        key,
        route,
        requestHash,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
  }

  complete(userId: string, key: string, statusCode: number, responseBody: unknown) {
    return this.prisma.idempotencyKey.update({
      where: { userId_key: { userId, key } },
      data: {
        statusCode,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  }
}
