import { z } from 'zod';
import { nonEmptyTrimmedString, paginationQuerySchema, uuidSchema } from './base';
import { zoneDimensionSchema, zoneSettingsSchema } from './zone-settings';

export const zoneTypeSchema = z.enum([
  'BED',
  'GREENHOUSE',
  'ORCHARD',
  'FLOWERBED',
  'FIELD',
  'OTHER',
]);

export const plantStatusSchema = z.enum([
  'PLANNED',
  'PLANTED',
  'GROWING',
  'FLOWERING',
  'FRUITING',
  'HARVESTING',
  'FINISHED',
  'HAS_PROBLEM',
]);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .optional()
    .nullable();

const decimalString = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^-?\d+(\.\d+)?$/.test(value), { message: 'Некоректне число' });

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const optionalDecimal = z.preprocess(emptyToNull, decimalString.nullable().optional());

/** Accepts ISO, datetime-local, or date-only (YYYY-MM-DD); empty → null */
const optionalDateTime = z.preprocess(
  emptyToNull,
  z
    .union([
      z
        .string()
        .min(1)
        .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Некоректна дата' })
        .transform((value) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(`${value}T12:00:00`).toISOString();
          }
          return new Date(value).toISOString();
        }),
      z.null(),
    ])
    .optional(),
);

export const createGardenSchema = z.object({
  name: nonEmptyTrimmedString(2, 120),
  description: optionalTrimmed(2000),
  locationName: optionalTrimmed(200),
  latitude: optionalDecimal,
  longitude: optionalDecimal,
  area: optionalDecimal,
});

export const updateGardenSchema = createGardenSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const gardenIdParamSchema = z.object({
  gardenId: uuidSchema,
});

export const listGardensQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
});

export const createZoneSchema = z
  .object({
    name: nonEmptyTrimmedString(2, 120),
    type: zoneTypeSchema.default('BED'),
    description: optionalTrimmed(2000),
    area: optionalDecimal,
    positionX: optionalDecimal,
    positionY: optionalDecimal,
    width: zoneDimensionSchema.optional(),
    height: zoneDimensionSchema.optional(),
    color: optionalTrimmed(32),
    settings: zoneSettingsSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.settings && value.settings.type !== value.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'settings.type має збігатися з type зони',
        path: ['settings', 'type'],
      });
    }

    if (value.settings?.type === 'BED' && value.width != null && value.height != null) {
      const widthM = Number(value.width);
      const heightM = Number(value.height);
      if (Number.isFinite(widthM) && Number.isFinite(heightM) && widthM > 0 && heightM > 0) {
        const axis = value.settings.rowDirection === 'horizontal' ? heightM : widthM;
        const maxRows = Math.max(1, Math.min(200, Math.floor(axis / 0.05)));
        if (value.settings.rowCount > maxRows) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Для ${axis.toFixed(1)} м максимум ${maxRows} рядків (мінімальний крок 5 см)`,
            path: ['settings', 'rowCount'],
          });
        }
      }
    }
  });

export const updateZoneSchema = z
  .object({
    name: nonEmptyTrimmedString(2, 120).optional(),
    type: zoneTypeSchema.optional(),
    description: optionalTrimmed(2000),
    area: optionalDecimal,
    positionX: optionalDecimal,
    positionY: optionalDecimal,
    width: zoneDimensionSchema.optional().nullable(),
    height: zoneDimensionSchema.optional().nullable(),
    color: optionalTrimmed(32),
    settings: zoneSettingsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Потрібно передати хоча б одне поле',
  });

export const zoneIdParamSchema = z.object({
  zoneId: uuidSchema,
});

export const listZonesQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
});

export const createPlantSchema = z.object({
  plantTypeId: uuidSchema,
  name: nonEmptyTrimmedString(2, 120),
  variety: optionalTrimmed(120),
  description: optionalTrimmed(2000),
  quantity: z.coerce.number().int().min(1).max(1_000_000).default(1),
  occupiedArea: optionalDecimal,
  positionX: optionalDecimal,
  positionY: optionalDecimal,
  size: optionalDecimal,
  rotation: optionalDecimal,
  plantedAt: optionalDateTime,
  expectedHarvestAt: optionalDateTime,
  status: plantStatusSchema.default('PLANNED'),
});

export const updatePlantSchema = z
  .object({
    plantTypeId: uuidSchema.optional(),
    name: nonEmptyTrimmedString(2, 120).optional(),
    variety: optionalTrimmed(120),
    description: optionalTrimmed(2000),
    quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
    occupiedArea: optionalDecimal,
    positionX: optionalDecimal,
    positionY: optionalDecimal,
    size: optionalDecimal,
    rotation: optionalDecimal,
    plantedAt: optionalDateTime,
    expectedHarvestAt: optionalDateTime,
    finishedAt: optionalDateTime,
    status: plantStatusSchema.optional(),
    version: z.coerce.number().int().positive(),
  })
  .refine(
    (value) =>
      Object.keys(value).some(
        (key) => key !== 'version' && value[key as keyof typeof value] !== undefined,
      ),
    { message: 'Потрібно передати хоча б одне поле крім version' },
  );

export const plantIdParamSchema = z.object({
  plantId: uuidSchema,
});

export const listPlantsQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'status']).default('updatedAt'),
  status: plantStatusSchema.optional(),
  zoneId: uuidSchema.optional(),
  gardenId: uuidSchema.optional(),
  plantTypeId: uuidSchema.optional(),
});

export type CreateGardenInput = z.infer<typeof createGardenSchema>;
export type UpdateGardenInput = z.infer<typeof updateGardenSchema>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export type CreatePlantInput = z.infer<typeof createPlantSchema>;
export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;
export type ListGardensQuery = z.infer<typeof listGardensQuerySchema>;
export type ListZonesQuery = z.infer<typeof listZonesQuerySchema>;
export type ListPlantsQuery = z.infer<typeof listPlantsQuerySchema>;
