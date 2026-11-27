import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_CSRF_KEY, type AuthenticatedRequest } from '../../common/decorators/auth.decorators';
import { CSRF_COOKIE, CsrfService, REFRESH_COOKIE } from '../csrf.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly csrf: CsrfService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip =
      this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const clientType = this.resolveClientType(request);
    request.clientType = clientType;

    if (clientType === 'mobile') {
      return true;
    }

    // CSRF protects cookie-based refresh transport (double-submit).
    // Pure Bearer clients (Swagger, mobile-style) do not need it.
    const refreshCookie = request.cookies?.[REFRESH_COOKIE];
    if (!refreshCookie) {
      return true;
    }

    const header = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(header) ? header[0] : header;
    this.csrf.validate(request.cookies?.[CSRF_COOKIE], headerToken);
    return true;
  }

  private resolveClientType(request: AuthenticatedRequest): 'web' | 'mobile' {
    const header = request.headers['x-client'];
    const raw = Array.isArray(header) ? header[0] : header;
    if (raw === 'mobile') {
      return 'mobile';
    }
    const bodyClient = (request.body as { clientType?: string } | undefined)?.clientType;
    if (bodyClient === 'mobile') {
      return 'mobile';
    }
    return 'web';
  }
}
