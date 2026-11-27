import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, type AuthenticatedRequest } from '../../common/decorators/auth.decorators';
import { unauthorized } from '../../common/errors/http-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized();
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw unauthorized();
    }

    const payload = await this.tokens.verifyAccessToken(token);
    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null },
      },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });
    if (!session) {
      throw unauthorized('Сесію завершено');
    }

    request.user = {
      id: session.userId,
      email: session.user.email,
      sessionId: session.id,
    };
    return true;
  }
}
