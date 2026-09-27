import { z } from 'zod';
import { nonEmptyTrimmedString, uuidSchema } from './base';
import { plantStatusSchema } from './garden';

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

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^-?\d+(\.\d+)?$/.test(value), { message: 'Некоректне число' });

const positiveMeters = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^(?:\d+)(?:\.\d+)?$/.test(value) && Number(value) > 0, {
    message: 'Розмір має бути більше 0',
  });

const optionalDateTime = z
  .union([
    z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Некоректна дата' })
      .transform((value) => new Date(value).toISOString()),
    z.null(),
  ])
  .optional();

export const plantTypeCategorySchema = z.enum([
  'VEGETABLE',
  'FRUIT',
  'BERRY',
  'HERB',
  'FLOWER',
  'TREE',
  'SHRUB',
  'OTHER',
]);

export const createPlantTypeSchema = z.object({
  name: nonEmptyTrimmedString(2, 120),
  scientificName: optionalTrimmed(200),
  description: optionalTrimmed(2000),
  category: plantTypeCategorySchema.default('OTHER'),
  iconKey: optionalTrimmed(64),
});

export const listPlantTypesQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: plantTypeCategorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const bedLayoutPlantOpSchema = z.enum(['upsert', 'delete']);

export const bedLayoutPlantItemSchema = z
  .object({
    clientId: z.string().min(1).max(64).optional(),
    id: uuidSchema.optional(),
    op: bedLayoutPlantOpSchema.default('upsert'),
    plantTypeId: uuidSchema.optional(),
    name: nonEmptyTrimmedString(2, 120).optional(),
    variety: optionalTrimmed(120),
    quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
    status: plantStatusSchema.optional(),
    plantedAt: optionalDateTime,
    description: optionalTrimmed(2000),
    positionX: z.preprocess(emptyToNull, decimalString.nullable().optional()),
    positionY: z.preprocess(emptyToNull, decimalString.nullable().optional()),
    size: z.preprocess(emptyToNull, decimalString.nullable().optional()),
    rotation: z.preprocess(emptyToNull, decimalString.nullable().optional()),
    version: z.coerce.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.op === 'delete') {
      if (!value.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Для delete потрібен id',
          path: ['id'],
        });
      }
      return;
    }
    if (!value.plantTypeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'plantTypeId обовʼязковий для upsert',
        path: ['plantTypeId'],
      });
    }
    if (!value.name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'name обовʼязковий для upsert',
        path: ['name'],
      });
    }
    if (value.positionX == null || value.positionY == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'positionX/positionY обовʼязкові для upsert',
        path: ['positionX'],
      });
    }
    if (value.id && value.version == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'version обовʼязковий для існуючих рослин',
        path: ['version'],
      });
    }
  });

export const updateBedLayoutSchema = z.object({
  zoneUpdatedAt: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Некоректна дата' }),
  bed: z.object({
    name: nonEmptyTrimmedString(2, 120).optional(),
    width: positiveMeters,
    height: positiveMeters,
  }),
  settings: z.unknown().optional(),
  plants: z.array(bedLayoutPlantItemSchema).max(500),
});

export type CreatePlantTypeInput = z.infer<typeof createPlantTypeSchema>;
export type ListPlantTypesQuery = z.infer<typeof listPlantTypesQuerySchema>;
export type UpdateBedLayoutInput = z.infer<typeof updateBedLayoutSchema>;
export type BedLayoutPlantItem = z.infer<typeof bedLayoutPlantItemSchema>;
