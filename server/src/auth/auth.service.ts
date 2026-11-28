import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session, User } from '@prisma/client';
import type {
  AuthSessionDto,
  AuthTokensDto,
  ClientType,
  MessageResponse,
  UserPublicDto,
} from '@smart-garden/types';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@smart-garden/validation';
import { randomInt, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  validationError,
} from '../common/errors/http-errors';
import { toUserPublicDto } from '../common/mappers/user.mapper';
import { generateOpaqueToken, hashIp, normalizeEmail, sha256 } from '../common/utils/crypto.util';
import type { AppEnv } from '../config/env.validation';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CookieService } from './cookie.service';
import { CsrfService } from './csrf.service';
import { PasswordService } from './password.service';
import { RateLimitService } from './rate-limit.service';
import { TokenService } from './token.service';

type RequestMeta = {
  ip?: string;
  userAgent?: string;
  clientType: ClientType;
};

type AuthResult = {
  user: UserPublicDto;
  tokens: AuthTokensDto;
};

@Injectable()
export class AuthService {
  private readonly refreshTtlSeconds: number;
  private readonly emailVerifyTtlSeconds: number;
  private readonly passwordResetTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly rateLimit: RateLimitService,
    private readonly cookies: CookieService,
    private readonly csrf: CsrfService,
    private readonly storage: StorageService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.refreshTtlSeconds = config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true });
    this.emailVerifyTtlSeconds = config.get('EMAIL_VERIFICATION_TTL_SECONDS', { infer: true });
    this.passwordResetTtlSeconds = config.get('PASSWORD_RESET_TTL_SECONDS', { infer: true });
  }

  async register(input: RegisterInput, meta: RequestMeta): Promise<MessageResponse> {
    await this.rateLimit.consume({
      key: `register:ip:${meta.ip ?? 'unknown'}`,
      limit: 3,
      windowSeconds: 3600,
    });

    this.passwords.assertPolicy(input.password);
    const normalizedEmail = normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({
      where: { normalizedEmail },
    });

    const autoVerify = process.env.AUTO_VERIFY_EMAIL === 'true';

    if (existing && !existing.deletedAt) {
      if (!existing.emailVerifiedAt) {
        if (autoVerify) {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: { emailVerifiedAt: new Date() },
          });
          return { message: 'Акаунт підтверджено! Тепер ви можете увійти.' };
        }
        await this.issueEmailVerification(existing);
        return { message: 'Якщо обліковий запис існує, ми надіслали лист для підтвердження' };
      }
      throw conflict('Користувач із цим email уже зареєстрований');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const verifiedAt = autoVerify ? new Date() : null;
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            email: normalizedEmail,
            passwordHash,
            deletedAt: null,
            emailVerifiedAt: verifiedAt,
            avatarUrl: null,
          },
        })
      : await this.prisma.user.create({
          data: {
            name: input.name,
            email: normalizedEmail,
            normalizedEmail,
            passwordHash,
            emailVerifiedAt: verifiedAt,
          },
        });

    if (autoVerify) {
      return { message: 'Реєстрація успішна! Тепер ви можете увійти в акаунт.' };
    }

    await this.issueEmailVerification(user);
    return {
      message: 'Реєстрація успішна. Перевірте пошту (або dev-codes.log на ПК) і введіть код підтвердження',
    };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<MessageResponse> {
    const tokenHash = sha256(input.token);
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record || record.user.deletedAt) {
      throw unauthorized('Недійсний або прострочений токен підтвердження');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email підтверджено' };
  }

  async resendVerification(
    input: ResendVerificationInput,
    meta: RequestMeta,
  ): Promise<MessageResponse> {
    await this.rateLimit.consume({
      key: `resend-verify:ip:${meta.ip ?? 'unknown'}`,
      limit: 5,
      windowSeconds: 3600,
    });

    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { normalizedEmail } });
    if (user && !user.deletedAt && !user.emailVerifiedAt) {
      await this.issueEmailVerification(user);
    }

    return {
      message: 'Якщо обліковий запис існує, ми надіслали код для підтвердження',
    };
  }

  async login(input: LoginInput, meta: RequestMeta, res: Response): Promise<AuthResult> {
    const normalizedEmail = normalizeEmail(input.email);
    await this.rateLimit.consume({
      key: `login:ip-email:${meta.ip ?? 'unknown'}:${normalizedEmail}`,
      limit: 5,
      windowSeconds: 15 * 60,
    });

    const user = await this.prisma.user.findUnique({ where: { normalizedEmail } });
    const invalid = unauthorized('Невірний email або пароль');

    if (!user || user.deletedAt) {
      // Constant-ish work to reduce timing oracle.
      await this.passwords.verify(
        '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        input.password,
      );
      throw invalid;
    }

    const ok = await this.passwords.verify(user.passwordHash, input.password);
    if (!ok) {
      throw invalid;
    }
    if (!user.emailVerifiedAt) {
      throw forbidden('Підтвердіть email перед входом');
    }

    const clientType = input.clientType ?? meta.clientType;
    return this.createSessionAndRespond(user, res, {
      ...meta,
      clientType,
      deviceName: input.deviceName,
    });
  }

  async refresh(
    refreshToken: string | undefined,
    meta: RequestMeta,
    res: Response,
  ): Promise<AuthTokensDto & { user: UserPublicDto }> {
    await this.rateLimit.consume({
      key: `refresh:ip:${meta.ip ?? 'unknown'}`,
      limit: 60,
      windowSeconds: 60,
    });

    if (!refreshToken) {
      throw unauthorized('Відсутній refresh-токен');
    }

    const tokenHash = sha256(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.user.deletedAt) {
      throw unauthorized('Недійсна сесія');
    }

    if (session.revokedAt) {
      // Reuse detection: revoke entire token family.
      await this.prisma.session.updateMany({
        where: { tokenFamily: session.tokenFamily, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw unauthorized('Виявлено повторне використання refresh-токена');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw unauthorized('Сесію прострочено');
    }

    const nextRefresh = generateOpaqueToken(32);
    const updated = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: sha256(nextRefresh),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
        ipHash: hashIp(meta.ip),
        userAgent: meta.userAgent?.slice(0, 512) ?? session.userAgent,
      },
      include: { user: true },
    });

    const accessToken = await this.tokens.signAccessToken({
      sub: updated.userId,
      email: updated.user.email,
      sid: updated.id,
    });

    const tokens = this.applyClientTransport(res, meta.clientType, accessToken, nextRefresh);
    return { ...tokens, user: await this.toUserDto(updated.user) };
  }

  async logout(userId: string, sessionId: string, res: Response): Promise<MessageResponse> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.clearAuthCookies(res);
    return { message: 'Вихід виконано' };
  }

  async logoutAll(userId: string, res: Response): Promise<MessageResponse> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.recordAudit(userId, 'AUTH_LOGOUT_ALL', 'User', userId);
    this.clearAuthCookies(res);
    return { message: 'Усі сесії завершено' };
  }

  async forgotPassword(input: ForgotPasswordInput, meta: RequestMeta): Promise<MessageResponse> {
    await this.rateLimit.consume({
      key: `forgot:ip:${meta.ip ?? 'unknown'}`,
      limit: 5,
      windowSeconds: 3600,
    });

    const normalizedEmail = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { normalizedEmail } });
    if (user && !user.deletedAt) {
      const token = String(randomInt(100000, 1000000));
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + this.passwordResetTtlSeconds * 1000),
        },
      });
      await this.mail.sendPasswordReset(user.email, user.name, token);
    }

    return {
      message: 'Якщо обліковий запис існує, ми надіслали код для зміни пароля на пошту',
    };
  }

  async resetPassword(input: ResetPasswordInput, meta?: RequestMeta): Promise<MessageResponse> {
    await this.rateLimit.consume({
      key: `reset:ip:${meta?.ip ?? 'unknown'}`,
      limit: 10,
      windowSeconds: 3600,
    });
    this.passwords.assertPolicy(input.password);
    const tokenHash = sha256(input.token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record || record.user.deletedAt) {
      throw unauthorized('Недійсний або прострочений токен скидання пароля');
    }

    const passwordHash = await this.passwords.hash(input.password);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.recordAudit(record.userId, 'AUTH_PASSWORD_RESET', 'User', record.userId, {
      ip: meta?.ip ?? null,
    });

    return { message: 'Пароль оновлено. Увійдіть знову' };
  }

  async changePassword(
    userId: string,
    sessionId: string,
    input: ChangePasswordInput,
  ): Promise<MessageResponse> {
    if (input.currentPassword === input.newPassword) {
      throw validationError({ newPassword: ['Новий пароль має відрізнятися від поточного'] });
    }
    this.passwords.assertPolicy(input.newPassword);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw notFound('Користувача не знайдено');
    }

    const ok = await this.passwords.verify(user.passwordHash, input.currentPassword);
    if (!ok) {
      throw unauthorized('Невірний поточний пароль');
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null, id: { not: sessionId } },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.recordAudit(userId, 'AUTH_PASSWORD_CHANGED', 'User', userId);

    return { message: 'Пароль змінено' };
  }

  async me(userId: string): Promise<UserPublicDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw notFound('Користувача не знайдено');
    }
    return this.toUserDto(user);
  }

  async listSessions(userId: string, currentSessionId: string): Promise<AuthSessionDto[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((session) => this.toSessionDto(session, currentSessionId));
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
  ): Promise<MessageResponse> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) {
      throw notFound('Сесію не знайдено');
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    if (sessionId === currentSessionId) {
      return { message: 'Поточну сесію завершено' };
    }
    return { message: 'Сесію завершено' };
  }

  private async createSessionAndRespond(
    user: User,
    res: Response,
    meta: RequestMeta & { deviceName?: string },
  ): Promise<AuthResult> {
    const refreshToken = generateOpaqueToken(32);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        tokenFamily: randomUUID(),
        deviceName: meta.deviceName ?? null,
        ipHash: hashIp(meta.ip),
        userAgent: meta.userAgent?.slice(0, 512) ?? null,
        expiresAt: new Date(Date.now() + this.refreshTtlSeconds * 1000),
      },
    });

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      email: user.email,
      sid: session.id,
    });

    const tokens = this.applyClientTransport(res, meta.clientType, accessToken, refreshToken);
    return { user: await this.toUserDto(user), tokens };
  }

  private applyClientTransport(
    res: Response,
    clientType: ClientType,
    accessToken: string,
    refreshToken: string,
  ): AuthTokensDto {
    const csrfToken = this.csrf.issueToken();
    this.csrf.setCsrfCookie(res, csrfToken);

    if (clientType === 'web') {
      this.cookies.setRefreshCookie(res, refreshToken);
      return {
        accessToken,
        expiresIn: this.tokens.getAccessTokenTtlSeconds(),
        tokenType: 'Bearer',
      };
    }

    this.cookies.clearRefreshCookie(res);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokens.getAccessTokenTtlSeconds(),
      tokenType: 'Bearer',
    };
  }

  private clearAuthCookies(res: Response): void {
    this.cookies.clearRefreshCookie(res);
    this.csrf.clearCsrfCookie(res);
  }

  private async issueEmailVerification(user: User): Promise<void> {
    const token = String(randomInt(100000, 1000000));
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + this.emailVerifyTtlSeconds * 1000),
      },
    });
    await this.mail.sendEmailVerification(user.email, user.name, token);
  }

  private async toUserDto(user: User): Promise<UserPublicDto> {
    const dto = toUserPublicDto(user);
    if (dto.avatarUrl && !dto.avatarUrl.startsWith('http')) {
      dto.avatarUrl = await this.storage.createDownloadUrl(dto.avatarUrl);
    }
    return dto;
  }

  private toSessionDto(session: Session, currentSessionId: string): AuthSessionDto {
    return {
      id: session.id,
      deviceName: session.deviceName,
      lastUsedAt: session.lastUsedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      current: session.id === currentSessionId,
    };
  }

  private async recordAudit(
    userId: string | null,
    action: string,
    entityType: string,
    entityId?: string | null,
    metadata?: Record<string, string | null>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId: entityId ?? null,
          ...(metadata ? { metadata } : {}),
        },
      });
    } catch {
      // Audit logging must not break primary auth flows.
    }
  }
}
