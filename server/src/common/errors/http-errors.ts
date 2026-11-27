import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiErrorCode } from '@smart-garden/types';

type ErrorBody = {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function body(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ErrorBody {
  return { statusCode, code, message, fieldErrors };
}

export class AppHttpException extends HttpException {
  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(body(statusCode, code, message, fieldErrors), statusCode);
  }
}

export function validationError(
  fieldErrors: Record<string, string[]>,
  message = 'Некоректні дані',
): AppHttpException {
  return new AppHttpException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', message, fieldErrors);
}

export function unauthorized(message = 'Потрібна автентифікація'): UnauthorizedException {
  return new UnauthorizedException(body(401, 'UNAUTHORIZED', message));
}

export function forbidden(message = 'Доступ заборонено'): ForbiddenException {
  return new ForbiddenException(body(403, 'FORBIDDEN', message));
}

export function notFound(message = 'Не знайдено'): NotFoundException {
  return new NotFoundException(body(404, 'NOT_FOUND', message));
}

export function conflict(message: string): ConflictException {
  return new ConflictException(body(409, 'CONFLICT', message));
}

export function rateLimited(message = 'Забагато запитів. Спробуйте пізніше'): AppHttpException {
  return new AppHttpException(HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', message);
}
