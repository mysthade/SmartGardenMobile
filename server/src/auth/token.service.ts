import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { AppEnv } from '../config/env.validation';
import { unauthorized } from '../common/errors/http-errors';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  sid: string;
};

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTtlSeconds: number;

  constructor(config: ConfigService<AppEnv, true>) {
    this.accessSecret = config.get('ACCESS_TOKEN_SECRET', { infer: true });
    this.accessTtlSeconds = config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
  }

  getAccessTokenTtlSeconds(): number {
    return this.accessTtlSeconds;
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return jwt.sign({ email: payload.email, sid: payload.sid }, this.accessSecret, {
      subject: payload.sub,
      expiresIn: this.accessTtlSeconds,
      algorithm: 'HS256',
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;

      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.sid !== 'string'
      ) {
        throw unauthorized('Недійсний токен доступу');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        sid: payload.sid,
      };
    } catch {
      throw unauthorized('Недійсний або прострочений токен доступу');
    }
  }
}
