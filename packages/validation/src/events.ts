import { z } from 'zod';
import { nonEmptyTrimmedString, paginationQuerySchema, uuidSchema } from './base';

const optionalTrimmed = (max: number) =>
  z
    .union([
      z
        .string()
        .max(max)
        .transform((value) => {
          const trimmed = value.trim();
          return trimmed.length === 0 ? null : trimmed;
        }),
      z.null(),
    ])
    .optional();

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^-?\d+(\.\d+)?$/.test(value), { message: 'Некоректне число' });

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const optionalDecimal = z.preprocess(emptyToNull, decimalString.nullable().optional());
const optionalDateTime = z.preprocess(
  emptyToNull,
  z
    .union([
      z
        .string()
        .min(1)
        .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Некоректна дата' })
        .transform((value) => new Date(value).toISOString()),
      z.null(),
    ])
    .optional(),
);

const requiredDateTime = z
  .string()
  .min(1, 'Дата обовʼязкова')
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Некоректна дата' })
  .transform((value) => new Date(value).toISOString());

export const journalEntryTypeSchema = z.enum([
  'OBSERVATION',
  'GROWTH',
  'FLOWERING',
  'FRUITING',
  'NOTE',
  'OTHER',
]);

export const harvestUnitSchema = z.enum(['GRAM', 'KILOGRAM', 'PIECE', 'LITER']);
export const harvestQualitySchema = z.enum(['EXCELLENT', 'GOOD', 'AVERAGE', 'POOR']);
export const problemSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const problemStatusSchema = z.enum(['DETECTED', 'MONITORING', 'TREATING', 'RESOLVED']);
export const careActivityTypeSchema = z.enum([
  'WATERING',
  'FERTILIZING',
  'PRUNING',
  'TRANSPLANTING',
  'PEST_TREATMENT',
  'TYING',
  'SOIL_TREATMENT',
  'OTHER',
]);
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']);

export const journalEntryIdParamSchema = z.object({ entryId: uuidSchema });
export const harvestIdParamSchema = z.object({ harvestId: uuidSchema });
export const problemIdParamSchema = z.object({ problemId: uuidSchema });
export const careActivityIdParamSchema = z.object({ activityId: uuidSchema });
export const taskIdParamSchema = z.object({ taskId: uuidSchema });
export const attachmentIdParamSchema = z.object({ attachmentId: uuidSchema });

export const createJournalEntrySchema = z.object({
  type: journalEntryTypeSchema.default('OBSERVATION'),
  title: nonEmptyTrimmedString(2, 200),
  description: optionalTrimmed(5000),
  conditionScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  height: optionalDecimal,
  heightUnit: optionalTrimmed(16),
  observedAt: requiredDateTime,
});

export const updateJournalEntrySchema = createJournalEntrySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const listJournalQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['observedAt', 'createdAt']).default('observedAt'),
  type: journalEntryTypeSchema.optional(),
});

export const createHarvestSchema = z.object({
  harvestedAt: requiredDateTime,
  quantity: decimalString,
  unit: harvestUnitSchema,
  damagedQuantity: optionalDecimal,
  quality: harvestQualitySchema.default('GOOD'),
  notes: optionalTrimmed(2000),
});

export const updateHarvestSchema = createHarvestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const listHarvestsQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['harvestedAt', 'createdAt']).default('harvestedAt'),
});

export const createProblemSchema = z.object({
  title: nonEmptyTrimmedString(2, 200),
  description: optionalTrimmed(5000),
  suspectedCause: optionalTrimmed(500),
  severity: problemSeveritySchema.default('MEDIUM'),
  status: problemStatusSchema.default('DETECTED'),
  detectedAt: requiredDateTime,
  resolvedAt: optionalDateTime,
  solution: optionalTrimmed(5000),
});

export const updateProblemSchema = createProblemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const listProblemsQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['detectedAt', 'createdAt', 'severity']).default('detectedAt'),
  status: problemStatusSchema.optional(),
  severity: problemSeveritySchema.optional(),
});

export const createCareActivitySchema = z.object({
  type: careActivityTypeSchema,
  performedAt: requiredDateTime,
  quantity: optionalDecimal,
  unit: optionalTrimmed(32),
  productName: optionalTrimmed(200),
  notes: optionalTrimmed(2000),
});

export const updateCareActivitySchema = createCareActivitySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const listCareActivitiesQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['performedAt', 'createdAt']).default('performedAt'),
  type: careActivityTypeSchema.optional(),
});

export const createTaskSchema = z.object({
  title: nonEmptyTrimmedString(2, 200),
  description: optionalTrimmed(5000),
  gardenId: uuidSchema.optional().nullable(),
  zoneId: uuidSchema.optional().nullable(),
  plantId: uuidSchema.optional().nullable(),
  dueAt: optionalDateTime,
  priority: taskPrioritySchema.default('MEDIUM'),
  status: taskStatusSchema.default('TODO'),
  reminderAt: optionalDateTime,
});

export const updateTaskSchema = z
  .object({
    title: nonEmptyTrimmedString(2, 200).optional(),
    description: optionalTrimmed(5000),
    gardenId: uuidSchema.optional().nullable(),
    zoneId: uuidSchema.optional().nullable(),
    plantId: uuidSchema.optional().nullable(),
    dueAt: optionalDateTime,
    priority: taskPrioritySchema.optional(),
    status: taskStatusSchema.optional(),
    reminderAt: optionalDateTime,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const listTasksQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['dueAt', 'createdAt', 'priority']).default('dueAt'),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  gardenId: uuidSchema.optional(),
  zoneId: uuidSchema.optional(),
  plantId: uuidSchema.optional(),
});

export const allowedUploadMimeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export const createUploadUrlSchema = z
  .object({
    originalFileName: nonEmptyTrimmedString(1, 255),
    mimeType: allowedUploadMimeSchema,
    size: z.coerce
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024, 'Максимальний розмір файлу — 10 МБ'),
    plantId: uuidSchema.optional().nullable(),
    journalEntryId: uuidSchema.optional().nullable(),
    problemId: uuidSchema.optional().nullable(),
    harvestId: uuidSchema.optional().nullable(),
  })
  .refine(
    (value) => Boolean(value.plantId || value.journalEntryId || value.problemId || value.harvestId),
    { message: 'Потрібно вказати батьківський ресурс для вкладення' },
  );

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
export type CreateHarvestInput = z.infer<typeof createHarvestSchema>;
export type UpdateHarvestInput = z.infer<typeof updateHarvestSchema>;
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
export type UpdateProblemInput = z.infer<typeof updateProblemSchema>;
export type CreateCareActivityInput = z.infer<typeof createCareActivitySchema>;
export type UpdateCareActivityInput = z.infer<typeof updateCareActivitySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;
export type ListJournalQuery = z.infer<typeof listJournalQuerySchema>;
export type ListHarvestsQuery = z.infer<typeof listHarvestsQuerySchema>;
export type ListProblemsQuery = z.infer<typeof listProblemsQuerySchema>;
export type ListCareActivitiesQuery = z.infer<typeof listCareActivitiesQuerySchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
