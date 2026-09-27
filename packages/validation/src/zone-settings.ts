import { z } from 'zod';
import type { ZoneType } from '@smart-garden/types';

const positiveNumber = z.coerce.number().positive().max(10_000);

export const rowDirectionSchema = z.enum(['horizontal', 'vertical']);
export const entranceSchema = z.enum(['north', 'south', 'east', 'west']);
export const flowerbedShapeSchema = z.enum(['rect', 'ellipse', 'circle']);
export const otherShapeSchema = z.enum(['rect', 'ellipse']);

export const bedSettingsSchema = z.object({
  type: z.literal('BED'),
  rowCount: z.coerce
    .number({ invalid_type_error: 'Вкажіть ціле число' })
    .int('Кількість рядків має бути цілим числом')
    .min(1, 'Мінімум 1 рядок')
    .max(200, 'Максимум 200 рядків')
    .default(4),
  rowDirection: rowDirectionSchema.default('horizontal'),
  rowSpacingM: positiveNumber.default(0.4),
  snapToRows: z.boolean().default(true),
});

export const greenhouseSettingsSchema = z.object({
  type: z.literal('GREENHOUSE'),
  innerBedCount: z.coerce.number().int().min(2).max(12).default(2),
  pathWidthM: positiveNumber.default(0.6),
  entrance: entranceSchema.default('south'),
});

export const orchardSettingsSchema = z.object({
  type: z.literal('ORCHARD'),
  treeSpacingM: positiveNumber.default(3),
  showCanopyRadius: z.boolean().default(true),
});

export const flowerbedSettingsSchema = z.object({
  type: z.literal('FLOWERBED'),
  shape: flowerbedShapeSchema.default('ellipse'),
  accentColor: z
    .string()
    .max(32)
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'Некоректний колір' })
    .optional()
    .nullable(),
});

export const fieldSettingsSchema = z.object({
  type: z.literal('FIELD'),
  sectorCount: z.coerce
    .number({ invalid_type_error: 'Вкажіть ціле число' })
    .int('Кількість секторів має бути цілим числом')
    .min(1, 'Мінімум 1 сектор')
    .max(100, 'Максимум 100 секторів')
    .default(4),
  rowDirection: rowDirectionSchema.default('horizontal'),
  rowSpacingM: positiveNumber.default(0.5),
});

export const otherSettingsSchema = z.object({
  type: z.literal('OTHER'),
  shape: otherShapeSchema.default('rect'),
  fillColor: z
    .string()
    .max(32)
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'Некоректний колір' })
    .optional()
    .nullable(),
});

export const zoneSettingsSchema = z.discriminatedUnion('type', [
  bedSettingsSchema,
  greenhouseSettingsSchema,
  orchardSettingsSchema,
  flowerbedSettingsSchema,
  fieldSettingsSchema,
  otherSettingsSchema,
]);

export type ZoneSettingsInput = z.infer<typeof zoneSettingsSchema>;
export type BedSettings = z.infer<typeof bedSettingsSchema>;
export type GreenhouseSettings = z.infer<typeof greenhouseSettingsSchema>;
export type OrchardSettings = z.infer<typeof orchardSettingsSchema>;
export type FlowerbedSettings = z.infer<typeof flowerbedSettingsSchema>;
export type FieldSettings = z.infer<typeof fieldSettingsSchema>;
export type OtherSettings = z.infer<typeof otherSettingsSchema>;

export function defaultZoneSettings(type: ZoneType): ZoneSettingsInput {
  switch (type) {
    case 'BED':
      return bedSettingsSchema.parse({ type: 'BED' });
    case 'GREENHOUSE':
      return greenhouseSettingsSchema.parse({ type: 'GREENHOUSE' });
    case 'ORCHARD':
      return orchardSettingsSchema.parse({ type: 'ORCHARD' });
    case 'FLOWERBED':
      return flowerbedSettingsSchema.parse({ type: 'FLOWERBED' });
    case 'FIELD':
      return fieldSettingsSchema.parse({ type: 'FIELD' });
    case 'OTHER':
    default:
      return otherSettingsSchema.parse({ type: 'OTHER' });
  }
}

export function parseZoneSettings(type: ZoneType, raw: unknown): ZoneSettingsInput {
  if (raw == null || typeof raw !== 'object') {
    return defaultZoneSettings(type);
  }
  const withType = { ...(raw as Record<string, unknown>), type };
  const parsed = zoneSettingsSchema.safeParse(withType);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultZoneSettings(type);
}

/** Soft bounds for zone dimensions (meters). */
export const ZONE_SIZE_LIMITS = {
  minWidth: 0.5,
  maxWidth: 200,
  minHeight: 0.5,
  maxHeight: 200,
} as const;

export const zoneDimensionSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .refine((value) => /^(?:\d+)(?:\.\d+)?$/.test(value) && Number(value) > 0, {
    message: 'Розмір має бути більше 0',
  })
  .refine((value) => Number(value) >= ZONE_SIZE_LIMITS.minWidth, {
    message: `Мінімум ${ZONE_SIZE_LIMITS.minWidth} м`,
  })
  .refine((value) => Number(value) <= ZONE_SIZE_LIMITS.maxWidth, {
    message: `Максимум ${ZONE_SIZE_LIMITS.maxWidth} м`,
  });
