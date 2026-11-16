import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { JournalEntryDto, MessageResponse, PaginatedResponse } from '@smart-garden/types';
import {
  createJournalEntrySchema,
  journalEntryIdParamSchema,
  listJournalQuerySchema,
  plantIdParamSchema,
  updateJournalEntrySchema,
  type CreateJournalEntryInput,
  type ListJournalQuery,
  type UpdateJournalEntryInput,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { Idempotent } from '../common/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JournalService } from './journal.service';

@ApiTags('journal')
@ApiBearerAuth()
@Controller()
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Idempotent()
  @Post('plants/:plantId/journal')
  async create(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Body(new ZodValidationPipe(createJournalEntrySchema)) body: CreateJournalEntryInput,
  ): Promise<JournalEntryDto> {
    return this.journal.create(user.id, params.plantId, body);
  }

  @Get('plants/:plantId/journal')
  async list(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(plantIdParamSchema)) params: { plantId: string },
    @Query(new ZodValidationPipe(listJournalQuerySchema)) query: ListJournalQuery,
  ): Promise<PaginatedResponse<JournalEntryDto>> {
    return this.journal.list(user.id, params.plantId, query);
  }

  @Get('journal/:entryId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(journalEntryIdParamSchema)) params: { entryId: string },
  ): Promise<JournalEntryDto> {
    return this.journal.get(user.id, params.entryId);
  }

  @Patch('journal/:entryId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(journalEntryIdParamSchema)) params: { entryId: string },
    @Body(new ZodValidationPipe(updateJournalEntrySchema)) body: UpdateJournalEntryInput,
  ): Promise<JournalEntryDto> {
    return this.journal.update(user.id, params.entryId, body);
  }

  @Delete('journal/:entryId')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param(new ZodValidationPipe(journalEntryIdParamSchema)) params: { entryId: string },
  ): Promise<MessageResponse> {
    return this.journal.remove(user.id, params.entryId);
  }
}
