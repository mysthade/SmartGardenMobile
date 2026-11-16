import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../config/env.validation';
import { MAIL_ADAPTER, type MailAdapter } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly webUrl: string;
  private readonly isDev: boolean;

  constructor(
    @Inject(MAIL_ADAPTER) private readonly adapter: MailAdapter,
    config: ConfigService<AppEnv, true>,
  ) {
    this.webUrl = config.get('WEB_URL', { infer: true }).replace(/\/$/, '');
    this.isDev = config.get('NODE_ENV', { infer: true }) === 'development';
  }

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const link = `${this.webUrl}/verify-email?token=${encodeURIComponent(token)}`;
    if (this.isDev) {
      this.logger.log(`[dev] Email verification link for ${to}: ${link}`);
    }
    await this.safeSend({
      to,
      subject: 'Підтвердження email — Smart Garden',
      text: `Вітаємо, ${name}!\n\nПідтвердіть email: ${link}\n\nПосилання дійсне обмежений час.`,
      html: `<p>Вітаємо, ${escapeHtml(name)}!</p><p><a href="${link}">Підтвердити email</a></p><p>Посилання дійсне обмежений час.</p>`,
      devLink: link,
    });
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const link = `${this.webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    if (this.isDev) {
      this.logger.log(`[dev] Password reset link for ${to}: ${link}`);
    }
    await this.safeSend({
      to,
      subject: 'Скидання пароля — Smart Garden',
      text: `Вітаємо, ${name}!\n\nСкинути пароль: ${link}\n\nЯкщо ви не надсилали запит — ігноруйте лист.`,
      html: `<p>Вітаємо, ${escapeHtml(name)}!</p><p><a href="${link}">Скинути пароль</a></p><p>Якщо ви не надсилали запит — ігноруйте лист.</p>`,
      devLink: link,
    });
  }

  private async safeSend(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
    devLink?: string;
  }): Promise<void> {
    try {
      await this.adapter.send(message);
    } catch (error) {
      // Do not fail auth flows on SMTP outages; log for ops.
      this.logger.warn(
        `Email not delivered (${message.subject}): ${error instanceof Error ? error.message : 'unknown'}`,
      );
      if (this.isDev && message.devLink) {
        this.logger.warn(`[dev] SMTP unavailable — use this link manually: ${message.devLink}`);
      }
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
