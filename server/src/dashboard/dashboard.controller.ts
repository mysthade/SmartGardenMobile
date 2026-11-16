import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type {
  ActivityItemDto,
  DashboardSummaryDto,
  HarvestListItemDto,
  JournalListItemDto,
  PaginatedResponse,
  ProblemListItemDto,
  ZoneListItemDto,
} from '@smart-garden/types';
import {
  dashboardActivityQuerySchema,
  listAllHarvestsQuerySchema,
  listAllJournalQuerySchema,
  listAllProblemsQuerySchema,
  listAllZonesQuerySchema,
  type DashboardActivityQuery,
  type ListAllHarvestsQuery,
  type ListAllJournalQuery,
  type ListAllProblemsQuery,
  type ListAllZonesQuery,
} from '@smart-garden/validation';
import { CurrentUser, type AuthUser } from '../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard/summary')
  summary(@CurrentUser() user: AuthUser): Promise<DashboardSummaryDto> {
    return this.dashboard.summary(user.id);
  }

  @Get('activity')
  activity(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(dashboardActivityQuerySchema)) query: DashboardActivityQuery,
  ): Promise<PaginatedResponse<ActivityItemDto>> {
    return this.dashboard.activity(user.id, query);
  }

  @Get('zones')
  listZones(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAllZonesQuerySchema)) query: ListAllZonesQuery,
  ): Promise<PaginatedResponse<ZoneListItemDto>> {
    return this.dashboard.listZones(user.id, query);
  }

  @Get('journal')
  listJournal(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAllJournalQuerySchema)) query: ListAllJournalQuery,
  ): Promise<PaginatedResponse<JournalListItemDto>> {
    return this.dashboard.listJournal(user.id, query);
  }

  @Get('harvests')
  listHarvests(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAllHarvestsQuerySchema)) query: ListAllHarvestsQuery,
  ): Promise<PaginatedResponse<HarvestListItemDto>> {
    return this.dashboard.listHarvests(user.id, query);
  }

  @Get('problems')
  listProblems(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAllProblemsQuerySchema)) query: ListAllProblemsQuery,
  ): Promise<PaginatedResponse<ProblemListItemDto>> {
    return this.dashboard.listProblems(user.id, query);
  }
}
