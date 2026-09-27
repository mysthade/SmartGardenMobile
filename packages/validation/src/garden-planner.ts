import { z } from 'zod';
import { nonEmptyTrimmedString, uuidSchema } from './base';

export const planObjectTypeSchema = z.enum([
  'HOUSE',
  'SHED',
  'GAZEBO',
  'BBQ',
  'GREENHOUSE',
  'GARAGE',
  'WELL',
  'BOREHOLE',
  'COMPOSTER',
  'POND',
  'POOL',
  'FENCE',
  'GATE',
  'PATH',
  'TREE',
  'BUSH',
  'FLOWERBED',
  'RAISED_BED',
  'LAWN',
  'PARKING',
  'TOILET',
  'CUSTOM',
]);

export const planObjectLayerSchema = z.enum([
  'BUILDINGS',
  'UTILITIES',
  'PLANTS',
  'PATHS',
  'OTHER',
]);

import { hasPolygonSelfIntersections } from './planner-math';

export const planBoundaryPointSchema = z.object({
  xCm: z.number().min(-100000).max(300000),
  yCm: z.number().min(-100000).max(300000),
});

export const planBoundarySchema = z
  .array(planBoundaryPointSchema)
  .max(500)
  .nullable()
  .optional()
  .refine(
    (pts) => {
      if (!pts || pts.length === 0) return true;
      return pts.length >= 3;
    },
    {
      message: 'Контур ділянки повинен містити щонайменше 3 вершини (полігон)',
    },
  )
  .refine(
    (pts) => {
      if (!pts || pts.length < 4) return true;
      return !hasPolygonSelfIntersections(pts);
    },
    {
      message: 'Контур ділянки не повинен мати самоперетинів',
    },
  );

/**
 * Валідація розмірів ділянки (у сантиметрах):
 * від 100 см (1 м) до 200 000 см (2000 м / 2 км).
 */
export const gardenPlanDimensionCmSchema = z
  .number()
  .min(100, 'Розмір ділянки має бути не менше 100 см (1 м)')
  .max(200000, 'Розмір ділянки не може перевищувати 200 000 см (2000 м)');

/**
 * Валідація розмірів обʼєкта (у сантиметрах): > 0 та до 200 000 см.
 */
export const planObjectDimensionCmSchema = z
  .number()
  .positive('Розмір обʼєкта має бути більше 0 см')
  .max(200000, 'Розмір обʼєкта не може перевищувати 200 000 см');

/**
 * Валідація координат розміщення обʼєкта (у сантиметрах).
 * Дозволяємо невеликий вихід за межі для зручності перетягування (-10000 см .. 250000 см).
 */
export const planCoordinateCmSchema = z
  .number()
  .min(-50000, 'Координата виходить за допустимі межі (-500 м)')
  .max(250000, 'Координата виходить за допустимі межі (2500 м)');

/**
 * Кут повороту: 0 .. 359.99 градусів.
 */
export const rotationDegSchema = z
  .number()
  .min(0, 'Кут повороту має бути від 0°')
  .max(359.99, 'Кут повороту має бути менше 360°');

/**
 * Кут напрямку півночі: 0 .. 359.99 градусів.
 */
export const northAngleDegSchema = z
  .number()
  .min(0, 'Кут півночі має бути від 0°')
  .max(359.99, 'Кут півночі має бути менше 360°');

/**
 * Крок сітки (у сантиметрах): від 10 см до 500 см (за замовчуванням 50 см = 0.5 м).
 */
export const gridSizeCmSchema = z
  .number()
  .min(10, 'Крок сітки має бути не менше 10 см')
  .max(500, 'Крок сітки не може перевищувати 500 см');

export const createGardenPlanSchema = z.object({
  name: nonEmptyTrimmedString(1, 120).default('Основний план'),
  widthCm: gardenPlanDimensionCmSchema,
  heightCm: gardenPlanDimensionCmSchema,
  boundary: planBoundarySchema,
  northAngleDeg: northAngleDegSchema.default(0),
  gridSizeCm: gridSizeCmSchema.default(50),
  isActive: z.boolean().default(true),
});

export const updateGardenPlanSchema = z.object({
  name: nonEmptyTrimmedString(1, 120).optional(),
  widthCm: gardenPlanDimensionCmSchema.optional(),
  heightCm: gardenPlanDimensionCmSchema.optional(),
  boundary: planBoundarySchema,
  northAngleDeg: northAngleDegSchema.optional(),
  gridSizeCm: gridSizeCmSchema.optional(),
  version: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const planObjectOperationSchema = z
  .object({
    op: z.enum(['upsert', 'delete']).default('upsert'),
    id: uuidSchema.optional(),
    clientId: z.string().min(1).max(64).optional(),
    type: planObjectTypeSchema.optional(),
    label: z.string().trim().max(120).optional(),
    xCm: planCoordinateCmSchema.optional(),
    yCm: planCoordinateCmSchema.optional(),
    widthCm: planObjectDimensionCmSchema.optional(),
    heightCm: planObjectDimensionCmSchema.optional(),
    rotationDeg: rotationDegSchema.default(0),
    zIndex: z.number().int().min(-100).max(1000).default(0),
    layer: planObjectLayerSchema.default('OTHER'),
    color: z.string().trim().max(32).nullable().optional(),
    locked: z.boolean().default(false),
    meta: z.record(z.unknown()).nullable().optional(),
    zoneId: uuidSchema.nullable().optional(),
    plantId: uuidSchema.nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.op === 'delete') {
      if (!val.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Для операції видалення (delete) обовʼязковий id',
          path: ['id'],
        });
      }
      return;
    }

    if (!val.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Поле type є обовʼязковим для збереження обʼєкта',
        path: ['type'],
      });
    }

    if (val.xCm === undefined || val.yCm === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Координати xCm та yCm є обовʼязковими',
        path: ['xCm'],
      });
    }

    if (val.widthCm === undefined || val.heightCm === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Розміри widthCm та heightCm є обовʼязковими',
        path: ['widthCm'],
      });
    }
  });

export const MAX_PLAN_OBJECTS = 2000;

export const batchPlanObjectsSchema = z.object({
  version: z.number().int().positive('Версія плану має бути додатнім числом'),
  planUpdate: updateGardenPlanSchema.optional(),
  objects: z.array(planObjectOperationSchema).max(MAX_PLAN_OBJECTS),
});

export const planIdParamSchema = z.object({
  planId: uuidSchema,
});

export const planObjectIdParamSchema = z.object({
  planId: uuidSchema,
  objectId: uuidSchema,
});

export const createPlanObjectSchema = z.object({
  type: planObjectTypeSchema,
  label: z.string().trim().max(120).default('Обʼєкт'),
  xCm: planCoordinateCmSchema,
  yCm: planCoordinateCmSchema,
  widthCm: planObjectDimensionCmSchema,
  heightCm: planObjectDimensionCmSchema,
  rotationDeg: rotationDegSchema.default(0),
  zIndex: z.number().int().min(-100).max(1000).default(0),
  layer: planObjectLayerSchema.default('OTHER'),
  color: z.string().trim().max(32).nullable().optional(),
  locked: z.boolean().default(false),
  meta: z.record(z.unknown()).nullable().optional(),
  zoneId: uuidSchema.nullable().optional(),
  plantId: uuidSchema.nullable().optional(),
});

export const updatePlanObjectSchema = z.object({
  type: planObjectTypeSchema.optional(),
  label: z.string().trim().max(120).optional(),
  xCm: planCoordinateCmSchema.optional(),
  yCm: planCoordinateCmSchema.optional(),
  widthCm: planObjectDimensionCmSchema.optional(),
  heightCm: planObjectDimensionCmSchema.optional(),
  rotationDeg: rotationDegSchema.optional(),
  zIndex: z.number().int().min(-100).max(1000).optional(),
  layer: planObjectLayerSchema.optional(),
  color: z.string().trim().max(32).nullable().optional(),
  locked: z.boolean().optional(),
  meta: z.record(z.unknown()).nullable().optional(),
  zoneId: uuidSchema.nullable().optional(),
  plantId: uuidSchema.nullable().optional(),
});

export const duplicateGardenPlanSchema = z.object({
  name: z.string().trim().max(120).optional(),
  isActive: z.boolean().default(false),
});

export type CreateGardenPlanInput = z.infer<typeof createGardenPlanSchema>;
export type UpdateGardenPlanInput = z.infer<typeof updateGardenPlanSchema>;
export type PlanObjectOperationInput = z.infer<typeof planObjectOperationSchema>;
export type BatchPlanObjectsInput = z.infer<typeof batchPlanObjectsSchema>;
export type CreatePlanObjectInput = z.infer<typeof createPlanObjectSchema>;
export type UpdatePlanObjectInput = z.infer<typeof updatePlanObjectSchema>;
export type DuplicateGardenPlanInput = z.infer<typeof duplicateGardenPlanSchema>;

