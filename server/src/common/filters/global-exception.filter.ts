import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody, ApiErrorCode } from '@smart-garden/types';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? randomUUID();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ApiErrorCode = 'INTERNAL_ERROR';
    let message = 'Внутрішня помилка сервера';
    let fieldErrors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (typeof payload === 'object' && payload !== null) {
        const body = payload as Record<string, unknown>;
        if (typeof body['message'] === 'string') {
          message = body['message'];
        } else if (Array.isArray(body['message'])) {
          message = 'Некоректні дані';
          fieldErrors = { _: body['message'].map(String) };
        }
        if (typeof body['code'] === 'string') {
          code = body['code'] as ApiErrorCode;
        } else {
          code = this.mapStatusToCode(statusCode);
        }
        if (body['fieldErrors'] && typeof body['fieldErrors'] === 'object') {
          fieldErrors = body['fieldErrors'] as Record<string, string[]>;
        }
      } else {
        code = this.mapStatusToCode(statusCode);
      }
    }

    if (statusCode >= 500) {
      this.logger.error(
        {
          requestId,
          path: request.url,
          method: request.method,
          err: exception instanceof Error ? exception.message : 'unknown',
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorBody = {
      statusCode,
      code,
      message,
      fieldErrors,
      requestId,
    };

    response.status(statusCode).json(body);
  }

  private mapStatusToCode(status: number): ApiErrorCode {
    switch (status) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 413:
        return 'PAYLOAD_TOO_LARGE';
      case 415:
        return 'UNSUPPORTED_MEDIA_TYPE';
      case 429:
        return 'RATE_LIMITED';
      case 503:
        return 'DATABASE_UNAVAILABLE';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
