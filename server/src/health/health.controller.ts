import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthLiveResponse, HealthReadyResponse } from '@smart-garden/types';
import { Public } from '../common/decorators/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @ApiOkResponse({ description: 'Process is alive' })
  live(): HealthLiveResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Dependencies are ready' })
  async ready(): Promise<HealthReadyResponse> {
    const [databaseUp, redisUp] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.isHealthy(),
    ]);

    const response: HealthReadyResponse = {
      status: databaseUp && redisUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
    };

    if (!databaseUp) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'База даних недоступна',
        ...response,
      });
    }

    return response;
  }
}
