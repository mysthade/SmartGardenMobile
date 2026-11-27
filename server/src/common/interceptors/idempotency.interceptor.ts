import { createHash } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../decorators/auth.decorators';
import { conflict, validationError } from '../errors/http-errors';
import { IdempotencyService } from '../../idempotency/idempotency.service';

export const IDEMPOTENT_KEY = 'idempotent';
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);

const TTL_SECONDS = 24 * 60 * 60;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotency: IdempotencyService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const enabled = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    if (!['POST', 'PUT'].includes(request.method.toUpperCase())) {
      return next.handle();
    }

    const header = request.headers['idempotency-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key || key.length < 8 || key.length > 128) {
      throw validationError({
        'Idempotency-Key': ['Обов’язковий заголовок Idempotency-Key (8–128 символів)'],
      });
    }

    const userId = request.user?.id;
    if (!userId) {
      return next.handle();
    }

    const route = `${request.method.toUpperCase()} ${request.route?.path ?? request.path}`;
    const requestHash = hashBody(request.body);
    const existing = await this.idempotency.find(userId, key);

    if (existing) {
      if (existing.route !== route || existing.requestHash !== requestHash) {
        throw conflict('Idempotency-Key уже використано з іншими даними');
      }
      if (
        existing.statusCode &&
        existing.responseBody !== null &&
        existing.responseBody !== undefined
      ) {
        response.status(existing.statusCode);
        return of(existing.responseBody);
      }
    } else {
      await this.idempotency.begin(userId, key, route, requestHash, TTL_SECONDS);
    }

    return next.handle().pipe(
      tap(async (body) => {
        const statusCode = response.statusCode || 201;
        await this.idempotency.complete(userId, key, statusCode, body);
      }),
    );
  }
}

function hashBody(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('hex');
}
