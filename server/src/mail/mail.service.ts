import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
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

  async sendEmailVerification(to: string, name: string, token: string): Promise<boolean> {
    const link = `${this.webUrl}/verify-email?token=${encodeURIComponent(token)}`;
    if (this.isDev) {
      this.logger.log(`[dev] Email verification code for ${to}: ${token} (${link})`);
      await this.appendLocalDevCode('EMAIL_VERIFY', to, token);
    }
    return this.safeSend({
      to,
      subject: 'Підтвердження email — Smart Garden',
      text: `Вітаємо, ${name}!\n\nВаш код підтвердження: ${token}\nАбо перейдіть за посиланням: ${link}\n\nКод дійсний обмежений час.`,
      html: `<p>Вітаємо, ${escapeHtml(name)}!</p><p>Ваш код підтвердження: <strong>${escapeHtml(token)}</strong></p><p>Або <a href="${link}">підтвердіть email за посиланням</a>.</p><p>Код дійсний обмежений час.</p>`,
      devLink: link,
    });
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<boolean> {
    const link = `${this.webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    if (this.isDev) {
      this.logger.log(`[dev] Password reset code for ${to}: ${token} (${link})`);
      await this.appendLocalDevCode('PASSWORD_RESET', to, token);
    }
    return this.safeSend({
      to,
      subject: 'Код для зміни / скидання пароля — Smart Garden',
      text: `Вітаємо, ${name}!\n\nВаш код підтвердження для зміни пароля: ${token}\nАбо перейдіть за посиланням: ${link}\n\nЯкщо ви не надсилали запит — ігноруйте лист.`,
      html: `<p>Вітаємо, ${escapeHtml(name)}!</p><p>Ваш код підтвердження для зміни пароля: <strong>${escapeHtml(token)}</strong></p><p>Або <a href="${link}">скиньте пароль за посиланням</a>.</p><p>Якщо ви не надсилали запит — ігноруйте лист.</p>`,
      devLink: link,
    });
  }

  private async appendLocalDevCode(kind: string, to: string, code: string): Promise<void> {
    try {
      const logPath = path.resolve(process.cwd(), 'dev-codes.log');
      const line = `[${new Date().toISOString()}] ${kind} | ${to} | КОД: ${code}\n`;
      await fs.appendFile(logPath, line, 'utf8');
    } catch {
      // Ignore file write errors in read-only environments.
    }
  }

  private async safeSend(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
    devLink?: string;
  }): Promise<boolean> {
    try {
      await this.adapter.send(message);
      return true;
    } catch (error) {
      // Do not fail auth flows on SMTP outages; log for ops.
      this.logger.warn(
        `Email not delivered (${message.subject}): ${error instanceof Error ? error.message : 'unknown'}`,
      );
      if (this.isDev && message.devLink) {
        this.logger.warn(`[dev] SMTP unavailable — use this link manually: ${message.devLink}`);
      }
      return false;
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
