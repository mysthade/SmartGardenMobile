import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppEnv } from '../config/env.validation';
import { generateOpaqueToken, hmacSha256, safeEqual } from '../common/utils/crypto.util';
import { forbidden } from '../common/errors/http-errors';

export const REFRESH_COOKIE = 'sg_refresh';
export const CSRF_COOKIE = 'sg_csrf';

@Injectable()
export class CsrfService {
  private readonly secret: string;
  private readonly isProd: boolean;

  constructor(config: ConfigService<AppEnv, true>) {
    this.secret = config.get('CSRF_SECRET', { infer: true });
    this.isProd = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  issueToken(): string {
    const nonce = generateOpaqueToken(24);
    const signature = hmacSha256(this.secret, nonce);
    return `${nonce}.${signature}`;
  }

  validate(cookieToken: string | undefined, headerToken: string | undefined): void {
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      throw forbidden('Недійсний CSRF-токен');
    }
    const [nonce, signature] = cookieToken.split('.');
    if (!nonce || !signature) {
      throw forbidden('Недійсний CSRF-токен');
    }
    const expected = hmacSha256(this.secret, nonce);
    if (!safeEqual(signature, expected)) {
      throw forbidden('Недійсний CSRF-токен');
    }
  }

  setCsrfCookie(res: Response, token: string): void {
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: this.isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  clearCsrfCookie(res: Response): void {
    res.clearCookie(CSRF_COOKIE, {
      httpOnly: false,
      secure: this.isProd,
      sameSite: 'lax',
      path: '/',
    });
  }
}
