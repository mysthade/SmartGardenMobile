import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  providers: [
    IdempotencyService,
    IdempotencyInterceptor,
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
