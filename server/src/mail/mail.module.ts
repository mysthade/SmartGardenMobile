import { Module } from '@nestjs/common';
import { MAIL_ADAPTER } from './mail.types';
import { MailService } from './mail.service';
import { SmtpMailAdapter } from './smtp.mail.adapter';

@Module({
  providers: [
    SmtpMailAdapter,
    {
      provide: MAIL_ADAPTER,
      useExisting: SmtpMailAdapter,
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
