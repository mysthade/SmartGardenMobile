import { z } from 'zod';
import { paginationQuerySchema } from './base';

export const dashboardActivityQuerySchema = paginationQuerySchema;

export const listAllZonesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  type: z.enum(['BED', 'GREENHOUSE', 'ORCHARD', 'FLOWERBED', 'FIELD', 'OTHER']).optional(),
});

export const listAllJournalQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  type: z.enum(['OBSERVATION', 'GROWTH', 'FLOWERING', 'FRUITING', 'NOTE', 'OTHER']).optional(),
});

export const listAllHarvestsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
});

export const listAllProblemsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  status: z.enum(['DETECTED', 'MONITORING', 'TREATING', 'RESOLVED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export type DashboardActivityQuery = z.infer<typeof dashboardActivityQuerySchema>;
export type ListAllZonesQuery = z.infer<typeof listAllZonesQuerySchema>;
export type ListAllJournalQuery = z.infer<typeof listAllJournalQuerySchema>;
export type ListAllHarvestsQuery = z.infer<typeof listAllHarvestsQuerySchema>;
export type ListAllProblemsQuery = z.infer<typeof listAllProblemsQuerySchema>;
