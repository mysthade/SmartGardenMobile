import { z } from 'zod';

/** Matches C0 control characters that must not appear in user text. */
// eslint-disable-next-line no-control-regex -- intentional control-char denylist
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const uuidSchema = z.string().uuid();

export const nonEmptyTrimmedString = (min: number, max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(min)
        .max(max)
        .refine((value) => !CONTROL_CHARS.test(value), {
          message: 'Недопустимі керівні символи',
        }),
    );

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

/** Password policy: length only; strength checked separately against common lists. */
export const passwordSchema = z
  .string()
  .min(10, 'Пароль має містити щонайменше 10 символів')
  .max(128, 'Пароль занадто довгий');

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().max(200).optional(),
});

export const healthLiveSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
