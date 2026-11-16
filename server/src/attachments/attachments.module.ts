import { Module } from '@nestjs/common';
import { AttachmentsController, PlantAttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  controllers: [AttachmentsController, PlantAttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
