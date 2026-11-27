import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { rateLimited } from '../common/errors/http-errors';

type RateLimitRule = {
  key: string;
  limit: number;
  windowSeconds: number;
};

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly memoryCounters = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly redis: RedisService) {}

  async consume(rule: RateLimitRule): Promise<void> {
    if (process.env.REDIS_URL === 'memory') {
      this.consumeMemory(rule);
      return;
    }

    try {
      const client = this.redis.getClient();
      await this.redis.connect();
      const redisKey = `rl:${rule.key}`;
      const count = await client.incr(redisKey);
      if (count === 1) {
        await client.expire(redisKey, rule.windowSeconds);
      }
      if (count > rule.limit) {
        throw rateLimited();
      }
    } catch (err) {
      // У режимі розробки без Docker/Redis використовуємо in-memory fallback, щоб не блокувати вхід
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`Redis недоступний, використовую in-memory rate limit: ${err instanceof Error ? err.message : String(err)}`);
        this.consumeMemory(rule);
        return;
      }
      throw err;
    }
  }

  private consumeMemory(rule: RateLimitRule): void {
    const now = Date.now();
    if (this.memoryCounters.size > 5000) {
      for (const [k, entry] of this.memoryCounters) {
        if (entry.expiresAt <= now) {
          this.memoryCounters.delete(k);
        }
      }
    }
    const existing = this.memoryCounters.get(rule.key);
    if (!existing || existing.expiresAt <= now) {
      this.memoryCounters.set(rule.key, {
        count: 1,
        expiresAt: now + rule.windowSeconds * 1000,
      });
      return;
    }

    existing.count += 1;
    if (existing.count > rule.limit) {
      throw rateLimited();
    }
  }
}
