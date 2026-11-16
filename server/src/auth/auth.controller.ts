import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  AuthSessionDto,
  AuthTokensDto,
  MessageResponse,
  UserPublicDto,
} from '@smart-garden/types';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  sessionIdParamSchema,
  verifyEmailSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@smart-garden/validation';
import type { Response } from 'express';
import {
  CurrentUser,
  Public,
  SkipCsrf,
  type AuthenticatedRequest,
  type AuthUser,
} from '../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE } from './csrf.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @SkipCsrf()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    return this.auth.register(body, this.meta(req));
  }

  @Public()
  @SkipCsrf()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailInput,
  ): Promise<MessageResponse> {
    return this.auth.verifyEmail(body);
  }

  @Public()
  @SkipCsrf()
  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema)) body: ResendVerificationInput,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    return this.auth.resendVerification(body, this.meta(req));
  }

  @Public()
  @SkipCsrf()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: UserPublicDto; tokens: AuthTokensDto }> {
    return this.auth.login(body, this.meta(req, body.clientType), res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensDto & { user: UserPublicDto }> {
    const refreshToken = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
    return this.auth.refresh(refreshToken, this.meta(req, body.clientType), res);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    return this.auth.logout(user.id, user.sessionId, res);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    return this.auth.logoutAll(user.id, res);
  }

  @Public()
  @SkipCsrf()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    return this.auth.forgotPassword(body, this.meta(req));
  }

  @Public()
  @SkipCsrf()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    return this.auth.resetPassword(body, this.meta(req));
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<MessageResponse> {
    return this.auth.changePassword(user.id, user.sessionId, body);
  }

  @ApiBearerAuth()
  @Get('sessions')
  async sessions(@CurrentUser() user: AuthUser): Promise<AuthSessionDto[]> {
    return this.auth.listSessions(user.id, user.sessionId);
  }

  @ApiBearerAuth()
  @Delete('sessions/:sessionId')
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(sessionIdParamSchema)) params: { sessionId: string },
  ): Promise<MessageResponse> {
    return this.auth.revokeSession(user.id, params.sessionId, user.sessionId);
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserPublicDto> {
    return this.auth.me(user.id);
  }

  private meta(
    req: AuthenticatedRequest,
    clientType?: 'web' | 'mobile',
  ): { ip?: string; userAgent?: string; clientType: 'web' | 'mobile' } {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      clientType: clientType ?? req.clientType ?? 'web',
    };
  }
}
