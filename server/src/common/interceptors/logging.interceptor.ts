import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string; user?: { id?: string } }>();
    const response = http.getResponse<Response>();
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'info',
              requestId: request.requestId,
              route: request.route?.path ?? request.url,
              method: request.method,
              statusCode: response.statusCode,
              duration: Date.now() - started,
              userId: request.user?.id,
              event: 'http_request',
            }),
          );
        },
        error: (err: unknown) => {
          const status =
            err instanceof HttpException
              ? err.getStatus()
              : response.statusCode >= 400
                ? response.statusCode
                : 500;

          this.logger.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'warn',
              requestId: request.requestId,
              route: request.route?.path ?? request.url,
              method: request.method,
              statusCode: status,
              duration: Date.now() - started,
              userId: request.user?.id,
              event: 'http_request_error',
              error: err instanceof Error ? err.message : 'Unknown error',
            }),
          );
        },
      }),
    );
  }
}
