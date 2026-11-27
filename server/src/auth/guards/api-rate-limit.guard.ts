import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/decorators/auth.decorators';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class ApiRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const path = request.path ?? request.url ?? '';

    if (path.startsWith('/health/')) {
      return true;
    }

    const actor = request.user?.id ? `u:${request.user.id}` : `ip:${request.ip ?? 'unknown'}`;
    const isUploadRoute =
      path.includes('/storage/upload') || path.includes('/attachments/upload-url');

    await this.rateLimit.consume({
      key: isUploadRoute ? `api-upload:${actor}` : `api-global:${actor}`,
      limit: isUploadRoute ? 20 : 180,
      windowSeconds: 60,
    });

    return true;
  }
}

