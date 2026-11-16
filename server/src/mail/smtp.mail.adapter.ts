import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { AppEnv } from '../config/env.validation';
import type { MailAdapter, MailMessage } from './mail.types';

@Injectable()
export class SmtpMailAdapter implements MailAdapter {
  private readonly logger = new Logger(SmtpMailAdapter.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: (() => {
        const user = config.get('SMTP_USER', { infer: true });
        const pass = config.get('SMTP_PASSWORD', { infer: true });
        if (!user) {
          return undefined;
        }
        return { user, pass };
      })(),
    });
  }

  async send(message: MailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${message.to}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw error;
    }
  }
}
