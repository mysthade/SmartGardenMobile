import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppEnv } from '../config/env.validation';
import { REFRESH_COOKIE } from './csrf.service';

@Injectable()
export class CookieService {
  private readonly isProd: boolean;
  private readonly refreshTtlSeconds: number;

  constructor(config: ConfigService<AppEnv, true>) {
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
    this.refreshTtlSeconds = config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true });
  }

  setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: this.refreshTtlSeconds * 1000,
    });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.isProd,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }
}
