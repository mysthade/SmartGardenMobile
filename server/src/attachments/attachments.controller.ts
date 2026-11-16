import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AttachmentDto, MessageResponse, UploadUrlResponse } from '@smart-garden/types';
import {
  attachmentIdParamSchema,
  createUploadUrlSchema,
  plantIdParamSchema,
  type CreateUploadUrlInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Idempotent()
  @Post('upload-url')
  async createUploadUrl(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createUploadUrlSchema)) body: CreateUploadUrlInput,
  ): Promise<UploadUrlResponse> {
    return this.attachments.createUploadUrl(user.id, body);
  }

  @Post(':attachmentId/confirm')
  @HttpCode(200)
  async confirm(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(attachmentIdParamSchema)) params: { attachmentId: string },
  ): Promise<AttachmentDto> {
    return this.attachments.confirm(user.id, params.attachmentId);
  }

  @Get(':attachmentId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(attachmentIdParamSchema)) params: { attachmentId: string },
  ): Promise<AttachmentDto> {
    return this.attachments.get(user.id, params.attachmentId);
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(attachmentIdParamSchema)) params: { attachmentId: string },
  ): Promise<MessageResponse> {
    return this.attachments.remove(user.id, params.attachmentId);
  }
}

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('plants/:plantId/attachments')
export class PlantAttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
  ): Promise<AttachmentDto[]> {
    return this.attachments.listByPlant(user.id, params.plantId);
  }
}
